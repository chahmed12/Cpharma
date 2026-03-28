"""
accounts/views.py
=================
Vues d'authentification et de gestion des profils utilisateurs.

Organisation des imports :
  1. Stdlib / Asgiref
  2. Django
  3. Django REST Framework
  4. Simple JWT
  5. Django Channels
  6. Local (models, serializers, core)
"""

# ── 1. Stdlib / Asgiref ───────────────────────────────────────────────────────
from asgiref.sync import async_to_sync

# ── 2. Django ─────────────────────────────────────────────────────────────────
from django.conf import settings
from django.contrib.auth import authenticate
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail

# ── 3. Django REST Framework ──────────────────────────────────────────────────
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

# ── 4. Simple JWT ─────────────────────────────────────────────────────────────
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

# ── 5. Django Channels ────────────────────────────────────────────────────────
from channels.layers import get_channel_layer

# ── 6. Local ──────────────────────────────────────────────────────────────────
from apps.core.audit import log_action
from apps.core.permissions import IsVerified
from .models import DoctorProfile
from .serializers import (
    DoctorListSerializer,
    RegisterSerializer,
    UserSerializer,
    DoctorProfileSerializer,
    DoctorProfileUpdateSerializer,
)


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS PRIVÉS
# ─────────────────────────────────────────────────────────────────────────────


def _set_auth_cookies(response: Response, refresh: RefreshToken) -> None:
    """
    Positionne les deux cookies HttpOnly (access + refresh) sur la Response.
    Factoriser ici pour éviter la duplication entre login et refresh.
    """
    cookie_kwargs = dict(
        httponly=settings.AUTH_COOKIE_HTTP_ONLY,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path=settings.AUTH_COOKIE_PATH,
    )
    response.set_cookie(
        key=settings.AUTH_COOKIE,
        value=str(refresh.access_token),
        **cookie_kwargs,
    )
    response.set_cookie(
        key=settings.AUTH_COOKIE_REFRESH,
        value=str(refresh),
        **cookie_kwargs,
    )


def _delete_auth_cookies(response: Response) -> None:
    """Supprime les deux cookies d'authentification."""
    response.delete_cookie(settings.AUTH_COOKIE, path=settings.AUTH_COOKIE_PATH)
    response.delete_cookie(settings.AUTH_COOKIE_REFRESH, path=settings.AUTH_COOKIE_PATH)


# ─────────────────────────────────────────────────────────────────────────────
#  AUTH — REGISTER / LOGIN / LOGOUT / ME / REFRESH
# ─────────────────────────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register(request):
    """
    Crée un nouveau compte (MEDECIN ou PHARMACIEN uniquement).
    Accepte multipart/form-data pour permettre l'envoi d'une image de profil.
    Le compte est créé avec is_verified=False → en attente d'approbation admin.
    """
    serializer = RegisterSerializer(
        data=request.data,
        context={"request": request},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()

    # Notification email à l'administrateur
    admin_emails = [email for name, email in getattr(settings, "ADMINS", [])]
    if not admin_emails:
        admin_emails = [
            getattr(settings, "DEFAULT_FROM_EMAIL", "admin@pfamedical.local")
        ]

    try:
        send_mail(
            subject="Nouvelle inscription PFA Medical",
            message=f"Un nouvel utilisateur ({user.role}) s'est inscrit : {user.email}.\nVeuillez valider son compte dans l'interface d'administration.",
            from_email=getattr(
                settings, "DEFAULT_FROM_EMAIL", "noreply@pfamedical.local"
            ),
            recipient_list=admin_emails,
            fail_silently=True,
        )
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.warning("Échec de l'envoi de l'email admin: %s", str(e))

    return Response(
        {
            "message": "Compte créé avec succès. En attente de validation par un administrateur."
        },
        status=status.HTTP_201_CREATED,
    )


class LoginRateThrottle(AnonRateThrottle):
    rate = "5/minute"


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([LoginRateThrottle])
def login(request):
    """
    Authentifie un utilisateur et positionne les tokens JWT en cookies HttpOnly.
    Retourne uniquement les données publiques de l'utilisateur (sans token dans le JSON).

    CHOIX INTENTIONNEL : token émis même pour les non-vérifiés
    afin qu'ils puissent voir la page /pending.
    ATTENTION : tout nouvel endpoint DOIT utiliser [IsAuthenticated, IsVerified]
    """
    email = request.data.get("email", "").strip().lower()
    password = request.data.get("password", "")

    if not email or not password:
        return Response(
            {"detail": "Email et mot de passe requis."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(request, username=email, password=password)

    if user is None:
        return Response(
            {"detail": "Email ou mot de passe incorrect."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {"detail": "Ce compte a été désactivé."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # NOTE: is_verified n'est PAS vérifié ici (voir docstring ci-dessus)

    log_action(user, "USER_LOGIN", "Connexion réussie")

    refresh = RefreshToken.for_user(user)
    response = Response({"user": UserSerializer(user).data}, status=status.HTTP_200_OK)
    _set_auth_cookies(response, refresh)
    return response


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle])
def refresh_token_view(request):
    """
    Rafraîchit le token d'accès en lisant le refresh token depuis le cookie HttpOnly.
    Le cookie de refresh est re-positionné avec une nouvelle expiration (rotation).

    Note : pour une rotation complète avec blacklist, activer
    `django.contrib.auth.backends.TokenBlacklist` dans INSTALLED_APPS.
    """
    raw_refresh = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)

    if not raw_refresh:
        return Response(
            {"detail": "Refresh token absent des cookies."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        refresh = RefreshToken(raw_refresh)

        # Blacklist de l'ancien token si activé
        if settings.SIMPLE_JWT.get("BLACKLIST_AFTER_ROTATION", False):
            try:
                refresh.blacklist()
            except AttributeError:
                pass

        # Rotation : on génère de nouvelles données pour le refresh token
        if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS", False):
            old_refresh = RefreshToken(raw_refresh)
            try:
                old_refresh.blacklist()
            except AttributeError:
                pass
            user_obj = User.objects.get(id=old_refresh.payload["user_id"])
            refresh = RefreshToken.for_user(user_obj)

        response = Response(
            {"message": "Token rafraîchi avec succès."}, status=status.HTTP_200_OK
        )
        _set_auth_cookies(response, refresh)
        return response

    except (TokenError, InvalidToken) as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout(request):
    """Invalide la session côté client en supprimant les cookies d'auth."""
    raw_refresh = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH, "")
    if raw_refresh:
        try:
            RefreshToken(raw_refresh).blacklist()
        except (TokenError, InvalidToken):
            pass
    log_action(request.user, "USER_LOGOUT", "Déconnexion")
    response = Response({"message": "Déconnexion réussie."}, status=status.HTTP_200_OK)
    _delete_auth_cookies(response)
    return response


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    """Retourne les informations publiques de l'utilisateur authentifié (via cookie)."""
    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
#  DOCTORS — LISTE / STATUT / CLÉ PUBLIQUE
# ─────────────────────────────────────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated, IsVerified])
def doctors_online(request):
    """Retourne la liste des médecins actuellement en ligne (status=ONLINE)."""
    profiles = DoctorProfile.objects.filter(status="ONLINE").select_related("user")
    serializer = DoctorListSerializer(profiles, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated, IsVerified])
def doctors_list(request):
    """Retourne la liste de tous les médecins (paginée)."""
    from rest_framework.pagination import PageNumberPagination

    profiles = DoctorProfile.objects.select_related("user").all().order_by("id")
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(profiles, request)
    serializer = DoctorListSerializer(page, many=True, context={"request": request})
    return paginator.get_paginated_response(serializer.data)


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated, IsVerified])
def update_doctor_status(request):
    """
    GET  → retourne le statut courant du médecin authentifié.
    PATCH → met à jour le statut et notifie les pharmaciens via WebSocket.
    Seul un utilisateur avec role=MEDECIN peut accéder à cet endpoint.
    """
    if request.user.role != "MEDECIN":
        return Response(
            {"detail": "Réservé aux médecins."}, status=status.HTTP_403_FORBIDDEN
        )

    try:
        profile = request.user.doctorprofile
    except ObjectDoesNotExist:
        return Response(
            {"detail": "Profil médecin introuvable pour cet utilisateur."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        return Response({"status": profile.status}, status=status.HTTP_200_OK)

    # PATCH
    new_status = request.data.get("status")
    valid_statuses = ("ONLINE", "OFFLINE", "BUSY")

    if new_status not in valid_statuses:
        return Response(
            {
                "detail": f"Statut invalide. Valeurs acceptées : {', '.join(valid_statuses)}."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    profile.status = new_status
    profile.save(update_fields=["status"])

    # Notification WebSocket — groupe des pharmaciens
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "pharmacists_broadcast",
        {
            "type": "doctor_status_changed",
            "doctor_id": request.user.id,
            "status": new_status,
        },
    )

    log_action(request.user, "DOCTOR_STATUS_CHANGE", f"Nouveau statut : {new_status}")
    return Response({"status": new_status}, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([permissions.IsAuthenticated, IsVerified])
def update_public_key(request):
    """
    Permet à un médecin d'enregistrer ou de mettre à jour sa clé publique RSA
    pour le système de signature des ordonnances (PKI).
    """
    if request.user.role != "MEDECIN":
        return Response(
            {"detail": "Seul un médecin peut mettre à jour sa clé publique."},
            status=status.HTTP_403_FORBIDDEN,
        )

    public_key = request.data.get("public_key", "").strip()

    if not public_key or len(public_key) < 50:
        return Response(
            {"detail": "Clé publique invalide ou trop courte."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Normalisation : toujours stocker en Base64 brut (sans headers PEM)
    if public_key.startswith("-----BEGIN"):
        lines = public_key.strip().split("\n")
        public_key = "".join(lines[1:-1])

    try:
        profile = request.user.doctorprofile
    except ObjectDoesNotExist:
        return Response(
            {"detail": "Profil médecin introuvable pour cet utilisateur."},
            status=status.HTTP_404_NOT_FOUND,
        )

    profile.public_key = public_key
    profile.save(update_fields=["public_key"])

    log_action(request.user, "KEY_UPDATE", "Mise à jour de la clé publique PKI")
    return Response({"ok": True}, status=status.HTTP_200_OK)


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated, IsVerified])
def doctor_profile(request):
    """GET: retourne le profil du médecin. PATCH: met à jour le profil."""
    try:
        profile = request.user.doctorprofile
    except ObjectDoesNotExist:
        return Response(
            {"detail": "Profil médecin introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        serializer = DoctorProfileSerializer(profile, context={"request": request})
        return Response(serializer.data)

    if request.method == "PATCH":
        serializer = DoctorProfileUpdateSerializer(
            profile, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(
                DoctorProfileSerializer(profile, context={"request": request}).data
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ─────────────────────────────────────────────────────────────────────────────
#  OTP — INSCRIPTION ET RÉINITIALISATION DE MOT DE PASSE
# ─────────────────────────────────────────────────────────────────────────────

from django.core.cache import cache
from django.utils.crypto import get_random_string
from django.contrib.auth import get_user_model

User = get_user_model()

@api_view(["POST"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle])
def send_register_otp(request):
    email = request.data.get("email", "").strip().lower()
    nom = request.data.get("nom", "Docteur").strip()
    
    if not email:
        return Response({"detail": "L'email est requis."}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(email=email).exists():
        return Response({"detail": "Cet email est déjà utilisé."}, status=status.HTTP_400_BAD_REQUEST)
    
    code = get_random_string(length=6, allowed_chars='0123456789')
    cache.set(f"otp_register_{email}", code, timeout=600)
    
    message = f"""Bonjour {nom},

Merci de vous être inscrit sur Cpharma. Pour finaliser votre inscription, veuillez utiliser le code de vérification suivant :

{code[0]} {code[1]} {code[2]} {code[3]} {code[4]} {code[5]}
Ce code expire dans 10 minutes.

Si vous n'avez pas créé de compte sur Cpharma, ignorez cet email.
L'équipe Cpharma

contact@cpharma.tn — Ne pas répondre à cet email automatique
"""
    try:
        send_mail(
            subject="Vérification de votre email - Cpharma",
            message=message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cpharma.tn"),
            recipient_list=[email],
            fail_silently=False,
        )
        return Response({"message": "Code envoyé avec succès."})
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur envoi OTP: {e}")
        return Response({"detail": "Erreur lors de l'envoi de l'email OTP."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["POST"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle])
def verify_register_otp(request):
    email = request.data.get("email", "").strip().lower()
    code = request.data.get("otp_code", "").strip()
    
    cached_code = cache.get(f"otp_register_{email}")
    if cached_code and cached_code == code:
        cache.set(f"otp_verified_{email}", True, timeout=3600)
        cache.delete(f"otp_register_{email}")
        return Response({"message": "Email vérifié avec succès."})
    
    return Response({"detail": "Code invalide ou expiré."}, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle])
def request_password_reset(request):
    email = request.data.get("email", "").strip().lower()
    if not email:
        return Response({"detail": "L'email est requis."}, status=status.HTTP_400_BAD_REQUEST)
        
    user = User.objects.filter(email=email).first()
    if not user:
        return Response({"message": "Si l'email existe, un code a été envoyé."})
        
    code = get_random_string(length=6, allowed_chars='0123456789')
    cache.set(f"otp_reset_{email}", code, timeout=600)
    
    message = f"""Bonjour {user.nom},

Vous avez demandé la réinitialisation de votre mot de passe. Utilisez ce code pour procéder :

{code[0]} {code[1]} {code[2]} {code[3]} {code[4]} {code[5]}
Ce code expire dans 10 minutes.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email et sécurisez votre compte.
L'équipe Cpharma


contact@cpharma.tn — Ne pas répondre à cet email automatique
"""
    try:
        send_mail(
            subject="Réinitialisation de votre mot de passe - Cpharma",
            message=message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@cpharma.tn"),
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur envoi OTP password reset: {e}")
        
    return Response({"message": "Si l'email existe, un code a été envoyé."})

@api_view(["POST"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle])
def verify_password_reset(request):
    """
    Vérifie le code OTP pour la réinitialisation de mot de passe.
    """
    email = request.data.get("email", "").strip().lower()
    code = request.data.get("otp_code", "").strip()
    
    if not email or not code:
        return Response({"detail": "Email et code OTP requis."}, status=status.HTTP_400_BAD_REQUEST)

    cached_code = cache.get(f"otp_reset_{email}")
    if cached_code and cached_code == code:
        # Autorise le changement de mot de passe pendant 15 minutes
        cache.set(f"otp_reset_verified_{email}", True, timeout=900)
        cache.delete(f"otp_reset_{email}")
        return Response({"message": "Code valide. Vous pouvez réinitialiser le mot de passe."})
    
    return Response({"detail": "Code invalide ou expiré."}, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle])
def confirm_password_reset(request):
    """
    Définit le nouveau mot de passe après vérification de l'OTP.
    """
    email = request.data.get("email", "").strip().lower()
    new_password = request.data.get("new_password", "")
    
    if not email or not new_password:
        return Response({"detail": "Email et nouveau mot de passe requis."}, status=status.HTTP_400_BAD_REQUEST)
        
    is_verified = cache.get(f"otp_reset_verified_{email}")
    if not is_verified:
        return Response({"detail": "Vous devez d'abord valider le code OTP."}, status=status.HTTP_403_FORBIDDEN)
        
    user = User.objects.filter(email=email).first()
    if not user:
        return Response({"detail": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)
        
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as DjangoValidationError
    try:
        validate_password(new_password)
    except DjangoValidationError as exc:
        return Response({"detail": list(exc.messages)[0]}, status=status.HTTP_400_BAD_REQUEST)
        
    user.set_password(new_password)
    user.save()
    
    cache.delete(f"otp_reset_verified_{email}")
    return Response({"message": "Mot de passe réinitialisé avec succès."})
