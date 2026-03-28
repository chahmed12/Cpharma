"""
apps/core/models.py
==================
Modèles de base pour l'application CPharma.
"""

from django.db import models


class AuditLog(models.Model):
    """
    Piste d'audit pour tracer toutes les actions sensibles.
    Remplace le logging Python par une journalisation persistante.
    """

    class Action(models.TextChoices):
        LOGIN = "LOGIN", "Connexion"
        LOGOUT = "LOGOUT", "Déconnexion"
        REGISTER = "REGISTER", "Inscription"
        CONSULTATION_CREATED = "CONSULTATION_CREATED", "Consultation créée"
        CONSULTATION_ACCEPTED = "CONSULTATION_ACCEPTED", "Consultation acceptée"
        CONSULTATION_COMPLETED = "CONSULTATION_COMPLETED", "Consultation terminée"
        CONSULTATION_CANCELLED = "CONSULTATION_CANCELLED", "Consultation annulée"
        PRESCRIPTION_CREATED = "PRESCRIPTION_CREATED", "Ordonnance créée"
        PRESCRIPTION_VERIFIED = "PRESCRIPTION_VERIFIED", "Ordonnance vérifiée"
        PRESCRIPTION_DISPENSED = "PRESCRIPTION_DISPENSED", "Ordonnance délivrée"
        PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED", "Paiement confirmé"
        DOCTOR_STATUS_CHANGED = "DOCTOR_STATUS_CHANGED", "Statut médecin modifié"
        PROFILE_UPDATED = "PROFILE_UPDATED", "Profil mis à jour"
        PUBLIC_KEY_UPLOADED = "PUBLIC_KEY_UPLOADED", "Clé publique uploadée"
        OTHER = "OTHER", "Autre action"

    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
        help_text="Utilisateur ayant effectué l'action",
    )
    action = models.CharField(
        max_length=50,
        choices=Action.choices,
        default=Action.OTHER,
        db_index=True,
        help_text="Type d'action effectuée",
    )
    details = models.TextField(
        blank=True, help_text="Détails de l'action (ID de ressource, etc.)"
    )
    ip_address = models.GenericIPAddressField(
        null=True, blank=True, help_text="Adresse IP du client"
    )
    user_agent = models.TextField(blank=True, help_text="User agent du navigateur")
    created_at = models.DateTimeField(
        auto_now_add=True, db_index=True, help_text="Horodatage de l'action"
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Journal d'audit"
        verbose_name_plural = "Journaux d'audit"
        indexes = [
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else "Anonymous"
        return f"[{self.created_at}] {user_str} - {self.action}"

    @classmethod
    def log_action(cls, user, action: str, details: str = "", request=None):
        """
        Crée une entrée d'audit.

        Args:
            user: CustomUser ou None
            action: Code de l'action (voir Action choices)
            details: Description détaillée
            request: Request Django (optionnel, pour ip/user_agent)
        """
        ip_address = None
        user_agent = ""

        if request:
            x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(",")[0].strip()
            else:
                ip_address = request.META.get("REMOTE_ADDR")
            user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]

        return cls.objects.create(
            user=user,
            action=action,
            details=details[:1000] if details else "",
            ip_address=ip_address,
            user_agent=user_agent,
        )
