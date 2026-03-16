from django.db   import models
from django.conf import settings

class Consultation(models.Model):

    class Status(models.TextChoices):
        PENDING   = 'PENDING',   'En attente'
        ACTIVE    = 'ACTIVE',    'En cours'
        COMPLETED = 'COMPLETED', 'Terminée'
        CANCELLED = 'CANCELLED', 'Annulée'

    pharmacien   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consultations_crees'
    )
    medecin      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consultations_recues'
    )
    patient_nom  = models.CharField(max_length=100)
    patient_age  = models.PositiveIntegerField()
    motif        = models.TextField()
    status       = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Consultation #{self.id} — {self.patient_nom} ({self.status})'