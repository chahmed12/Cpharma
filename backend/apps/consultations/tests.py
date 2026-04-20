from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.accounts.models import DoctorProfile, PharmacistProfile
from apps.consultations.models import Consultation
from django.test import tag
from apps.patients.models import Patient

User = get_user_model()

class ConsultationTests(APITestCase):
    def setUp(self):
        # Création Médecin en ligne
        self.medecin = User.objects.create_user(
            email="med@test.com", password="Password123!", role="MEDECIN", 
            is_verified=True, is_active=True, username="medtest", nom="Doc", prenom="Test"
        )
        DoctorProfile.objects.create(user=self.medecin, status="ONLINE")
        
        # Création d'un autre médecin occupé
        self.medecin_occupe = User.objects.create_user(
            email="med2@test.com", password="Password123!", role="MEDECIN", 
            is_verified=True, is_active=True, username="medtest2", nom="Doc2", prenom="Test2"
        )
        DoctorProfile.objects.create(user=self.medecin_occupe, status="BUSY")
        
        # Création Pharmacien
        self.pharmacien = User.objects.create_user(
            email="phar@test.com", password="Password123!", role="PHARMACIEN", 
            is_verified=True, is_active=True, username="phartest", nom="Pharma", prenom="Test"
        )
        PharmacistProfile.objects.create(user=self.pharmacien)
        
        # Création Patient
        self.patient = Patient.objects.create(
            nom="Test", prenom="Patient", telephone="12345678", date_naissance="1990-01-01"
        )

    @tag('fonctionnel')
    def test_creation_consultation_par_pharmacien(self):
        """Test fonctionnel : Un pharmacien peut créer une consultation."""
        self.client.force_authenticate(user=self.pharmacien)
        payload = {
            "patient_id": self.patient.id,
            "medecin": self.medecin.id,
            "motif": "Fièvre et toux"
        }
        res = self.client.post("/api/consultations/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Consultation.objects.count(), 1)
        self.assertEqual(Consultation.objects.first().status, "PENDING")

    @tag('securite')
    def test_creation_consultation_bloquee_pour_medecin(self):
        """Test Sécurité : Un médecin ne doit pas pouvoir initier une consultation (RBAC)."""
        self.client.force_authenticate(user=self.medecin)
        payload = {
            "patient_id": self.patient.id,
            "medecin": self.medecin.id,
            "motif": "Test securite"
        }
        res = self.client.post("/api/consultations/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Consultation.objects.count(), 0)

    @tag('fonctionnel')
    def test_creation_consultation_medecin_occupe(self):
        """Test fonctionnel : Impossible de demander une consultation avec un médecin non ONLINE."""
        self.client.force_authenticate(user=self.pharmacien)
        payload = {
            "patient_id": self.patient.id,
            "medecin": self.medecin_occupe.id,
            "motif": "Test dispo"
        }
        res = self.client.post("/api/consultations/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Ce médecin n'est pas disponible", str(res.data))

    @tag('securite')
    def test_status_update_security(self):
        """Test Sécurité : Changer le statut est restreint aux participants."""
        consultation = Consultation.objects.create(
            pharmacien=self.pharmacien, medecin=self.medecin, patient_id=self.patient.id, motif="Test", status="PENDING"
        )
        
        # Un hacker essaie de changer le statut
        hacker = User.objects.create_user(
            email="hacker@test.com", password="Password123!", role="PHARMACIEN", 
            is_verified=True, username="hacker", nom="Hack", prenom="Test"
        )
        self.client.force_authenticate(user=hacker)
        res = self.client.patch(f"/api/consultations/{consultation.id}/status/", {"status": "ACTIVE"}, format="json")
        
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
        
    @tag('workflow')
    def test_workflow_complet_consultation(self):
        """Test Intégration (Workflow complet) : De la création à ACTIVE."""
        # 1. Pharmacien crée la consultation
        self.client.force_authenticate(user=self.pharmacien)
        res_create = self.client.post("/api/consultations/", {
            "patient_id": self.patient.id,
            "medecin": self.medecin.id,
            "motif": "Workflow Test"
        }, format="json")
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        consultation_id = res_create.data['id']
        
        # 2. Le médecin se connecte et accepte la consultation
        self.client.force_authenticate(user=self.medecin)
        res_accept = self.client.patch(f"/api/consultations/{consultation_id}/status/", {"status": "ACTIVE"}, format="json")
        self.assertEqual(res_accept.status_code, status.HTTP_200_OK)
        
        # 3. Vérifier en base
        consultation_db = Consultation.objects.get(id=consultation_id)
        self.assertEqual(consultation_db.status, "ACTIVE")
