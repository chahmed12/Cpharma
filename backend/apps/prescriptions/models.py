from django.db   import models
from django.conf import settings

class Prescription(models.Model):
    medecin      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='prescriptions'
    )
    consultation = models.OneToOneField(
        'consultations.Consultation',
        on_delete=models.CASCADE,
        related_name='prescription'
    )

    # Contenu de l'ordonnance (JSON structuré)
    ordonnance_data        = models.JSONField()

    # Cryptographie PKI
    signature              = models.TextField()     # RSA-PSS base64
    sha256_hash            = models.CharField(max_length=512, unique=True)
    is_valid               = models.BooleanField(default=False)

    # Fichier PDF généré
    pdf                    = models.FileField(
        upload_to='prescriptions/pdfs/',
        null=True, blank=True
    )

    # Délivrance
    is_dispensed           = models.BooleanField(default=False)
    created_at             = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Prescription #{self.id} — {"✓" if self.is_valid else "✗"}'