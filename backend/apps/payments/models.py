from decimal import Decimal
from datetime import timedelta
from django.db import models
from django.conf import settings
from django.utils import timezone

# Taux de commission (15%) et tarif par défaut configurables via settings (env)
COMMISSION_RATE = getattr(settings, "CPHARMA_COMMISSION_RATE", Decimal("0.15"))
TARIF_DEFAUT = getattr(settings, "CPHARMA_TARIF_DEFAUT", Decimal("50.00"))

FREE_TRIAL_DAYS = 30  # Durée de l'abonnement offert à l'inscription


class Subscription(models.Model):
    """
    Abonnement mensuel d'un professionnel (médecin ou pharmacien) à la plateforme.

    Logique prototype :
    - Créé automatiquement via Signal Django lors de la création d'un profil pro.
    - end_date = today + 30 jours (offert à l'inscription pour les tests).
    - Renouvelable via POST /api/subscriptions/simulate-pay/ (+30 jours).
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    end_date = models.DateField(
        help_text="Date d'expiration de l'abonnement. Actif si end_date >= aujourd'hui."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Abonnement"
        verbose_name_plural = "Abonnements"

    def is_active(self) -> bool:
        """Retourne True si l'abonnement n'est pas encore expiré."""
        return self.end_date >= timezone.now().date()

    def extend(self, days: int = 30) -> None:
        """Prolonge l'abonnement de N jours à partir d'aujourd'hui ou de end_date."""
        base = max(self.end_date, timezone.now().date())
        self.end_date = base + timedelta(days=days)
        self.save(update_fields=["end_date", "updated_at"])

    def __str__(self):
        status = "✅ Actif" if self.is_active() else "❌ Expiré"
        return f"Subscription {self.user.email} — expire le {self.end_date} ({status})"



class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        PAID = "PAID", "Payé"
        FAILED = "FAILED", "Échoué"

    consultation = models.OneToOneField(
        "consultations.Consultation", on_delete=models.CASCADE, related_name="payment"
    )
    medecin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="paiements_recus",
    )

    montant_total = models.DecimalField(max_digits=8, decimal_places=2)
    commission = models.DecimalField(max_digits=8, decimal_places=2)
    honoraires_medecin = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["medecin", "status"]),
            models.Index(fields=["status", "created_at"]),
        ]

    @classmethod
    def create_for_consultation(cls, consultation):
        """Crée un paiement avec calcul automatique des montants."""
        # Utilise le tarif du médecin si configuré, sinon tarif par défaut
        try:
            tarif = (
                consultation.medecin.doctorprofile.tarif_consultation or TARIF_DEFAUT
            )
        except (AttributeError, Exception):
            tarif = TARIF_DEFAUT
        tarif = Decimal(str(tarif))
        commission = (tarif * COMMISSION_RATE).quantize(Decimal("0.01"))
        honoraires = tarif - commission
        return cls.objects.create(
            consultation=consultation,
            medecin=consultation.medecin,
            montant_total=tarif,
            commission=commission,
            honoraires_medecin=honoraires,
        )

    def __str__(self):
        return f"Payment #{self.id} — {self.montant_total} DNT ({self.status})"
