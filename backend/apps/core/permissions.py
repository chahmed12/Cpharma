from django.utils import timezone
from rest_framework import permissions


class IsVerified(permissions.BasePermission):
    """
    Permission qui n'autorise l'accès qu'aux utilisateurs ayant is_verified=True.
    """
    message = "Votre compte est en attente de vérification par un administrateur."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or request.user.is_verified


class IsSubscribed(permissions.BasePermission):
    """
    Permission qui vérifie qu'un professionnel a un abonnement actif.
    Bloque l'accès si end_date < aujourd'hui ou si aucun Subscription n'existe.

    Usage :
        @permission_classes([IsAuthenticated, IsVerified, IsSubscribed])
    """
    message = "Votre abonnement est expiré ou inexistant. Veuillez renouveler votre abonnement."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Les admins/superusers ne sont pas bloqués par l'abonnement
        if request.user.is_superuser:
            return True

        # Vérification de l'abonnement
        try:
            return request.user.subscription.end_date >= timezone.now().date()
        except Exception:
            return False
