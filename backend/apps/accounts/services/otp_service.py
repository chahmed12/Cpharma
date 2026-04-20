"""
accounts/services/otp_service.py
=================================
Service centralisé pour la gestion des codes OTP.

Remplace la logique dupliquée dans views.py entre l'inscription (register)
et la réinitialisation de mot de passe (reset).

Usage :
    from apps.accounts.services.otp_service import OTPService

    # Génération + envoi
    OTPService.generate_and_send(email="x@y.com", purpose="register", nom="Ali")

    # Vérification (retourne success, detail, http_status)
    ok, detail, code = OTPService.verify(email, "register", otp_code)

    # Marquer comme vérifié
    OTPService.mark_verified(email, "register")

    # Tester si vérifié
    if OTPService.is_verified(email, "register"): ...

    # Nettoyer après usage
    OTPService.clear_verified(email, "register")
"""

import logging
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils.crypto import get_random_string

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
#  Constantes
# ─────────────────────────────────────────────────────────────────────────────

_MAX_ATTEMPTS = 5
_CODE_TTL = 600       # 10 minutes — durée de validité du code
_VERIFIED_TTL = 3600  # 1 heure   — session "email vérifié" après inscription
_RESET_VERIFIED_TTL = 900  # 15 minutes — session "OTP reset" validé

# Templates de messages OTP
_TEMPLATES = {
    "register": {
        "subject": "Vérification de votre email - Cpharma",
        "body": (
            "Bonjour {nom},\n\n"
            "Merci de vous être inscrit sur Cpharma. "
            "Pour finaliser votre inscription, veuillez utiliser le code de vérification suivant :\n\n"
            "{code_spaced}\n\n"
            "Ce code expire dans 10 minutes.\n\n"
            "Si vous n'avez pas créé de compte sur Cpharma, ignorez cet email.\n"
            "L'équipe Cpharma\n\n"
            "contact@cpharma.tn — Ne pas répondre à cet email automatique"
        ),
    },
    "reset": {
        "subject": "Réinitialisation de votre mot de passe - Cpharma",
        "body": (
            "Bonjour {nom},\n\n"
            "Vous avez demandé la réinitialisation de votre mot de passe. "
            "Utilisez ce code pour procéder :\n\n"
            "{code_spaced}\n\n"
            "Ce code expire dans 10 minutes.\n\n"
            "Si vous n'avez pas demandé cette réinitialisation, "
            "ignorez cet email et sécurisez votre compte.\n"
            "L'équipe Cpharma\n\n"
            "contact@cpharma.tn — Ne pas répondre à cet email automatique"
        ),
    },
}


# ─────────────────────────────────────────────────────────────────────────────
#  OTPService
# ─────────────────────────────────────────────────────────────────────────────


class OTPService:
    """
    Service stateless pour la gestion du cycle de vie d'un OTP.
    Toutes les méthodes sont des classméthodes / staticméthodes.
    """

    # ── Clés de cache ─────────────────────────────────────────────────────────

    @staticmethod
    def _code_key(email: str, purpose: str) -> str:
        """Clé de cache pour le code OTP brut."""
        return f"otp_{purpose}_{email}"

    @staticmethod
    def _attempts_key(email: str, purpose: str) -> str:
        """Clé de cache pour le compteur de tentatives."""
        return f"otp_{purpose}_attempts_{email}"

    @staticmethod
    def _verified_key(email: str, purpose: str) -> str:
        """
        Clé de cache pour le flag 'email vérifié'.
        Convention historique préservée :
          - register → 'otp_verified_{email}'
          - reset    → 'otp_reset_verified_{email}'
        """
        if purpose == "register":
            return f"otp_verified_{email}"
        return f"otp_{purpose}_verified_{email}"

    # ── Génération & envoi ────────────────────────────────────────────────────

    @classmethod
    def generate_and_send(cls, email: str, purpose: str, nom: str) -> bool:
        """
        Génère un code OTP à 6 chiffres, le stocke en cache et envoie un email.

        Args:
            email:   Adresse email du destinataire.
            purpose: 'register' ou 'reset'.
            nom:     Prénom/nom pour personnaliser le message.

        Returns:
            True si l'email a été envoyé, False sinon.
        """
        if purpose not in _TEMPLATES:
            raise ValueError(f"Purpose OTP invalide : '{purpose}'. Valeurs acceptées : {list(_TEMPLATES)}")

        code = get_random_string(length=6, allowed_chars="0123456789")
        code_spaced = " ".join(code)  # Affichage: "1 2 3 4 5 6"

        # Stockage en cache avec TTL
        cache.set(cls._code_key(email, purpose), code, timeout=_CODE_TTL)

        # Construction du message
        tpl = _TEMPLATES[purpose]
        message = tpl["body"].format(nom=nom, code_spaced=code_spaced, email=email)

        try:
            send_mail(
                subject=tpl["subject"],
                message=message,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cpharma.tn"),
                recipient_list=[email],
                fail_silently=False,
            )
            logger.info("OTP [%s] envoyé à %s", purpose, email)
            return True
        except Exception as exc:
            logger.error("Erreur envoi OTP [%s] à %s : %s", purpose, email, exc)
            return False

    # ── Vérification ──────────────────────────────────────────────────────────

    @classmethod
    def verify(cls, email: str, purpose: str, code: str) -> tuple[bool, str | None, int]:
        """
        Vérifie un code OTP avec protection contre le brute-force.

        Returns:
            (success, error_detail, http_status_code)
            - (True,  None,        200) → code correct
            - (False, "...",       429) → trop de tentatives
            - (False, "...",       400) → code invalide ou expiré
        """
        attempts_key = cls._attempts_key(email, purpose)
        attempts = cache.get(attempts_key, 0)

        # Blocage si trop de tentatives
        if attempts >= _MAX_ATTEMPTS:
            cache.delete(cls._code_key(email, purpose))  # Invalide le code
            return False, "Trop de tentatives. Veuillez renvoyer un nouveau code.", 429

        cached_code = cache.get(cls._code_key(email, purpose))

        if cached_code and cached_code == code:
            cache.delete(attempts_key)          # Reset du compteur
            return True, None, 200

        # Mauvais code : incrémenter le compteur
        cache.set(attempts_key, attempts + 1, timeout=_CODE_TTL)
        return False, "Code invalide ou expiré.", 400

    # ── Gestion du flag "vérifié" ─────────────────────────────────────────────

    @classmethod
    def mark_verified(cls, email: str, purpose: str) -> None:
        """
        Marque l'email comme vérifié après un OTP correct.
        Supprime le code OTP utilisé pour empêcher la réutilisation.
        """
        ttl = _RESET_VERIFIED_TTL if purpose == "reset" else _VERIFIED_TTL
        cache.set(cls._verified_key(email, purpose), True, timeout=ttl)
        cache.delete(cls._code_key(email, purpose))

    @classmethod
    def is_verified(cls, email: str, purpose: str) -> bool:
        """Retourne True si l'OTP pour cet email/purpose a été validé."""
        return bool(cache.get(cls._verified_key(email, purpose)))

    @classmethod
    def clear_verified(cls, email: str, purpose: str) -> None:
        """Supprime le flag de vérification (à appeler après usage définitif)."""
        cache.delete(cls._verified_key(email, purpose))
