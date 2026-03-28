"""
apps/core/audit.py
==================
Journalisation d'audit pour les actions sensibles.
"""

from .models import AuditLog


def log_action(user, action, details="", request=None):
    """
    Enregistre une action dans la piste d'audit.

    Args:
        user: CustomUser ou None
        action: Code de l'action
        details: Description détaillée
        request: Request Django optionnel (pour IP et user agent)
    """
    AuditLog.log_action(user, action, details, request)
