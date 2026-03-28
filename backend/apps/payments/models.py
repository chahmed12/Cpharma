from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone

# Taux de commission (15%) et tarif par défaut configurables via settings (env)
COMMISSION_RATE = getattr(settings, "CPHARMA_COMMISSION_RATE", Decimal("0.15"))
TARIF_DEFAUT = getattr(settings, "CPHARMA_TARIF_DEFAUT", Decimal("50.00"))


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
        except (AttributeError, ObjectDoesNotExist):
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
