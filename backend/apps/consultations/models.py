from django.db import models
from django.conf import settings
from apps.patients.models import Patient


class Consultation(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        ACTIVE = "ACTIVE", "En cours"
        COMPLETED = "COMPLETED", "Terminée"
        CANCELLED = "CANCELLED", "Annulée"

    pharmacien = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="consultations_crees",
    )
    medecin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="consultations_recues",
    )

    # Nouveau : Relation avec le modèle Patient
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="consultations"
    )

    motif = models.TextField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["medecin", "status"]),
            models.Index(fields=["pharmacien", "status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Consultation #{self.id} — {self.patient.nom if self.patient else 'Inconnu'} ({self.status})"


class ChatMessage(models.Model):
    """Messages de chat entre médecin et pharmacien pendant une consultation."""

    consultation = models.ForeignKey(
        Consultation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return (
            f"Message de {self.sender.email} dans consultation #{self.consultation_id}"
        )
