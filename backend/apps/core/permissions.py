from rest_framework import permissions

class IsVerified(permissions.BasePermission):
    """
    Permission qui n'autorise l'accès qu'aux utilisateurs ayant is_verified=True.
    """
    message = "Votre compte est en attente de vérification par un administrateur."

    def has_permission(self, request, view):
        # L'admin a toujours accès par défaut via Django Admin, mais on s'assure qu'ici aussi
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Un superutilisateur ou un utilisateur vérifié a accès
        return request.user.is_superuser or request.user.is_verified
