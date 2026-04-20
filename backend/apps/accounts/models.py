from django.contrib.auth.models import AbstractUser
from django.db import models
from decimal import Decimal


class BaseProfile(models.Model):
    """
    Socle commun aux profils médecin et pharmacien.
    Regroupe les champs d'identité partagés pour éviter la duplication.
    Ce modèle est abstrait : il ne génère aucune table propre en base.
    """

    cin_numero = models.CharField(max_length=8, blank=True)
    gouvernorat = models.CharField(max_length=100, blank=True)

    class Meta:
        abstract = True


class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        MEDECIN = "MEDECIN", "Médecin"
        PHARMACIEN = "PHARMACIEN", "Pharmacien"
        ADMIN = "ADMIN", "Admin"

    email = models.EmailField(unique=True)
    nom = models.CharField(max_length=100, default="")
    prenom = models.CharField(max_length=100, default="")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEDECIN)
    is_verified = models.BooleanField(
        default=False,
        help_text="Cocher pour autoriser l'accès complet à l'application.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "nom", "prenom"]

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.role})"


class LegalAcceptance(models.Model):
    """
    Trace juridique des acceptations de documents lors de l'inscription.
    """
    DOCUMENT_TYPES = [
        ('CGU', 'Conditions Générales d\'Utilisation'),
        ('CONTRAT', 'Contrat de Partenariat'),
        ('CONFIDENTIALITE', 'Politique de Confidentialité'),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='legal_acceptances')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    version = models.CharField(max_length=10)
    accepted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = "Acceptation Légale"
        verbose_name_plural = "Acceptations Légales"

    def __str__(self):
        return f"{self.user.email} - {self.document_type} (v{self.version})"


class DoctorProfile(BaseProfile):
    """
    Profil spécifique aux médecins.
    Hérite de BaseProfile : cin_numero, gouvernorat.
    """

    class Status(models.TextChoices):
        OFFLINE = "OFFLINE", "Hors ligne"
        ONLINE = "ONLINE", "En ligne"
        BUSY = "BUSY", "Occupé"

    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name="doctorprofile"
    )
    # document_cin spécifique médecin (upload_to différent de PharmacistProfile)
    document_cin = models.FileField(upload_to="doctors/documents/cin/", null=True, blank=True)
    document_cnom = models.FileField(upload_to="doctors/documents/cnom/", null=True, blank=True)
    specialite = models.CharField(max_length=100, blank=True)
    numero_ordre = models.CharField(max_length=50, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OFFLINE
    )
    tarif_consultation = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal("50.00")
    )
    public_key = models.TextField(blank=True, null=True)
    photo = models.ImageField(upload_to="doctors/photos/", null=True, blank=True)

    def __str__(self):
        return f"Dr. {self.user.nom}"


class PharmacistProfile(BaseProfile):
    """
    Profil spécifique aux pharmaciens.
    Hérite de BaseProfile : cin_numero, gouvernorat.
    """

    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name="pharmacistprofile"
    )
    nom_pharmacie = models.CharField(max_length=200, blank=True)
    adresse = models.TextField(blank=True)
    photo_pharmacie = models.ImageField(
        upload_to="pharmacies/photos/", null=True, blank=True
    )
    numero_autorisation = models.CharField(max_length=100, blank=True)
    matricule_fiscal = models.CharField(max_length=100, blank=True)
    # document_cin spécifique pharmacie (upload_to différent de DoctorProfile)
    document_cin = models.FileField(upload_to="pharmacies/documents/cin/", null=True, blank=True)
    document_autorisation = models.FileField(upload_to="pharmacies/documents/autorisation/", null=True, blank=True)
    document_patente = models.FileField(upload_to="pharmacies/documents/patente/", null=True, blank=True)

    def __str__(self):
        return self.nom_pharmacie
