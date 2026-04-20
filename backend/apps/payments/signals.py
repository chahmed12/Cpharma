from datetime import timedelta
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from apps.consultations.models import Consultation
from apps.accounts.models import DoctorProfile, PharmacistProfile
from .models import Payment, Subscription, FREE_TRIAL_DAYS


# ─────────────────────────────────────────────────────────────────────────────
#  Signal existant : Payment automatique à la fin d'une consultation
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
#  Nouveau : Abonnement gratuit d'essai à la création d'un profil pro
# ─────────────────────────────────────────────────────────────────────────────

def _create_trial_subscription(user) -> None:
    """
    Crée un abonnement de FREE_TRIAL_DAYS jours pour l'utilisateur donné.
    Idempotent : si un Subscription existe déjà, rien n'est fait.
    """
    Subscription.objects.get_or_create(
        user=user,
        defaults={"end_date": timezone.now().date() + timedelta(days=FREE_TRIAL_DAYS)},
    )


@receiver(post_save, sender=DoctorProfile)
def create_subscription_for_doctor(sender, instance, created, **kwargs):
    """
    Donne automatiquement 30 jours d'abonnement gratuit
    à chaque nouveau médecin inscrit.
    """
    if created:
        _create_trial_subscription(instance.user)


@receiver(post_save, sender=PharmacistProfile)
def create_subscription_for_pharmacist(sender, instance, created, **kwargs):
    """
    Donne automatiquement 30 jours d'abonnement gratuit
    à chaque nouvelle pharmacie inscrite.
    """
    if created:
        _create_trial_subscription(instance.user)
