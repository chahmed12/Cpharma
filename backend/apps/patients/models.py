from django.db import models

class Patient(models.Model):
    class Sexe(models.TextChoices):
        MASCULIN = 'M', 'Masculin'
        FEMININ  = 'F', 'Féminin'

    nom            = models.CharField(max_length=100)
    prenom         = models.CharField(max_length=100)
    telephone      = models.CharField(max_length=20, unique=True)
    date_naissance = models.DateField()
    sexe           = models.CharField(max_length=1, choices=Sexe.choices, default=Sexe.MASCULIN)
    adresse        = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.telephone})"

class MedicalRecord(models.Model):
    patient            = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='medical_record')
    allergies          = models.TextField(blank=True, help_text="Ex: Pénicilline, Aspirine...")
    antecedents        = models.TextField(blank=True, help_text="Maladies chroniques, opérations...")
    groupe_sanguin     = models.CharField(max_length=5, blank=True)
    poids              = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    taille             = models.PositiveIntegerField(null=True, blank=True) # en cm
    derniere_mise_a_jour = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Dossier Médical - {self.patient.nom}"
