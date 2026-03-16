from django.contrib.auth.models import AbstractUser
from django.db                  import models
from decimal                    import Decimal


class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        MEDECIN    = 'MEDECIN',    'Médecin'
        PHARMACIEN = 'PHARMACIEN', 'Pharmacien'
        ADMIN      = 'ADMIN',      'Admin'

    email   = models.EmailField(unique=True)
    nom     = models.CharField(max_length=100, default='')
    prenom  = models.CharField(max_length=100, default='')
    role    = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEDECIN
    )

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['username', 'nom', 'prenom']

    def __str__(self):
        return f'{self.prenom} {self.nom} ({self.role})'


class DoctorProfile(models.Model):
    user              = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE,
        related_name='doctorprofile'
    )
    specialite        = models.CharField(max_length=100, blank=True)
    numero_ordre      = models.CharField(max_length=50,  blank=True)
    status            = models.CharField(max_length=20,  default='OFFLINE')
    tarif_consultation = models.DecimalField(
        max_digits=8, decimal_places=2,
        default=Decimal('50.00')
    )
    public_key        = models.TextField(blank=True, null=True)

    def __str__(self):
        return f'Dr. {self.user.nom}'


class PharmacistProfile(models.Model):
    user           = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE,
        related_name='pharmacistprofile'
    )
    nom_pharmacie  = models.CharField(max_length=200, blank=True)
    adresse        = models.TextField(blank=True)

    def __str__(self):
        return self.nom_pharmacie
