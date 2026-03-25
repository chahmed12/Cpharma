from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.consultations.models import Consultation
from .models import Payment


@receiver(post_save, sender=Consultation)
def create_payment_on_completion(sender, instance, created, **kwargs):
    """
    Déclenché à chaque sauvegarde d'une Consultation.
    Crée un Payment uniquement si :
    - Ce n'est pas une création (created=False)
    - Le statut vient de passer à COMPLETED
    - Aucun paiement n'existe déjà pour cette consultation
    """
    if created:
        return
    if instance.status != Consultation.Status.COMPLETED:
        return
    if Payment.objects.filter(consultation=instance).exists():
        return

    Payment.create_for_consultation(instance)


# ── Dans apps/payments/apps.py, enregistrer le signal ──
#
# from django.apps import AppConfig
#
# class PaymentsConfig(AppConfig):
#     name = 'apps.payments'
#
#     def ready(self):
#         import apps.payments.signals  # noqa
