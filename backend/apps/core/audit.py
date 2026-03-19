import logging

logger = logging.getLogger('audit')

def log_action(user, action, details=""):
    """
    Log une action critique avec l'utilisateur et les détails.
    """
    user_str = f"{user.email} (ID:{user.id})" if user and not user.is_anonymous else "Anonyme"
    logger.info(f"AUDIT | User: {user_str} | Action: {action} | Details: {details}")
