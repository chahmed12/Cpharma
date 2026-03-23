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
from django.conf                  import settings
from django.contrib.auth          import authenticate
from django.core.exceptions       import ObjectDoesNotExist
from django.core.mail             import send_mail

# ── 3. Django REST Framework ──────────────────────────────────────────────────
from rest_framework                  import permissions, status
from rest_framework.decorators       import api_view, permission_classes, throttle_classes
from rest_framework.response         import Response
from rest_framework.throttling       import AnonRateThrottle

# ── 4. Simple JWT ─────────────────────────────────────────────────────────────
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens     import RefreshToken

# ── 5. Django Channels ────────────────────────────────────────────────────────
from channels.layers import get_channel_layer

# ── 6. Local ──────────────────────────────────────────────────────────────────
from apps.core.audit         import log_action
from apps.core.permissions   import IsVerified
from .models                 import DoctorProfile
from .serializers            import DoctorListSerializer, RegisterSerializer, UserSerializer


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS PRIVÉS
# ─────────────────────────────────────────────────────────────────────────────

def _set_auth_cookies(response: Response, refresh: RefreshToken) -> None:
    """
    Positionne les deux cookies HttpOnly (access + refresh) sur la Response.
    Factoriser ici pour éviter la duplication entre login et refresh.
    """
    cookie_kwargs = dict(
        httponly = settings.AUTH_COOKIE_HTTP_ONLY,
        secure   = settings.AUTH_COOKIE_SECURE,
        samesite = settings.AUTH_COOKIE_SAMESITE,
        path     = settings.AUTH_COOKIE_PATH,
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
    response.delete_cookie(settings.AUTH_COOKIE,         path=settings.AUTH_COOKIE_PATH)
    response.delete_cookie(settings.AUTH_COOKIE_REFRESH, path=settings.AUTH_COOKIE_PATH)


# ─────────────────────────────────────────────────────────────────────────────
#  AUTH — REGISTER / LOGIN / LOGOUT / ME / REFRESH
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    """
    Crée un nouveau compte (MEDECIN ou PHARMACIEN uniquement).
    Accepte multipart/form-data pour permettre l'envoi d'une image de profil.
    Le compte est créé avec is_verified=False → en attente d'approbation admin.
    """
    serializer = RegisterSerializer(
        data=request.data,
        context={'request': request},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    
    # Notification email à l'administrateur
    admin_emails = [email for name, email in getattr(settings, 'ADMINS', [])]
    if not admin_emails:
        admin_emails = [getattr(settings, 'DEFAULT_FROM_EMAIL', 'admin@pfamedical.local')]
        
    try:
        send_mail(
            subject="Nouvelle inscription PFA Medical",
            message=f"Un nouvel utilisateur ({user.role}) s'est inscrit : {user.email}.\nVeuillez valider son compte dans l'interface d'administration.",
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@pfamedical.local'),
            recipient_list=admin_emails,
            fail_silently=True,
        )
    except Exception:
        pass  # On ignore silencieusement si le SMTP n'est pas configuré

    return Response(
        {'message': 'Compte créé avec succès. En attente de validation par un administrateur.'},
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    """
    Authentifie un utilisateur et positionne les tokens JWT en cookies HttpOnly.
    Retourne uniquement les données publiques de l'utilisateur (sans token dans le JSON).
    """
    email    = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')

    if not email or not password:
        return Response(
            {'detail': 'Email et mot de passe requis.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(request, username=email, password=password)

    if user is None:
        return Response(
            {'detail': 'Email ou mot de passe incorrect.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {'detail': 'Ce compte a été désactivé.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    log_action(user, 'USER_LOGIN', 'Connexion réussie')

    refresh  = RefreshToken.for_user(user)
    response = Response({'user': UserSerializer(user).data}, status=status.HTTP_200_OK)
    _set_auth_cookies(response, refresh)
    return response


@api_view(['POST'])
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
            {'detail': 'Refresh token absent des cookies.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        refresh = RefreshToken(raw_refresh)

        # Blacklist de l'ancien token si activé
        if settings.SIMPLE_JWT.get('BLACKLIST_AFTER_ROTATION', False):
            try:
                refresh.blacklist()
            except AttributeError:
                pass

        # Rotation : on génère de nouvelles données pour le refresh token
        if settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS', False):
            refresh.set_jti()
            refresh.set_exp()
            refresh.set_iat()

        response = Response({'message': 'Token rafraîchi avec succès.'}, status=status.HTTP_200_OK)
        _set_auth_cookies(response, refresh)
        return response

    except (TokenError, InvalidToken) as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout(request):
    """Invalide la session côté client en supprimant les cookies d'auth."""
    log_action(request.user, 'USER_LOGOUT', 'Déconnexion')
    response = Response({'message': 'Déconnexion réussie.'}, status=status.HTTP_200_OK)
    _delete_auth_cookies(response)
    return response


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    """Retourne les informations publiques de l'utilisateur authentifié (via cookie)."""
    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
#  DOCTORS — LISTE / STATUT / CLÉ PUBLIQUE
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsVerified])
def doctors_online(request):
    """Retourne la liste des médecins actuellement en ligne (status=ONLINE)."""
    profiles = DoctorProfile.objects.filter(status='ONLINE').select_related('user')
    serializer = DoctorListSerializer(profiles, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsVerified])
def doctors_list(request):
    """Retourne la liste de tous les médecins (paginée)."""
    from rest_framework.pagination import PageNumberPagination
    profiles = DoctorProfile.objects.select_related('user').all().order_by('id')
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(profiles, request)
    serializer = DoctorListSerializer(page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated, IsVerified])
def update_doctor_status(request):
    """
    GET  → retourne le statut courant du médecin authentifié.
    PATCH → met à jour le statut et notifie les pharmaciens via WebSocket.
    Seul un utilisateur avec role=MEDECIN peut accéder à cet endpoint.
    """
    if request.user.role != 'MEDECIN':
        return Response({'detail': 'Réservé aux médecins.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        profile = request.user.doctorprofile
    except ObjectDoesNotExist:
        return Response(
            {'detail': 'Profil médecin introuvable pour cet utilisateur.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == 'GET':
        return Response({'status': profile.status}, status=status.HTTP_200_OK)

    # PATCH
    new_status = request.data.get('status')
    valid_statuses = ('ONLINE', 'OFFLINE', 'BUSY')

    if new_status not in valid_statuses:
        return Response(
            {'detail': f"Statut invalide. Valeurs acceptées : {', '.join(valid_statuses)}."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    profile.status = new_status
    profile.save(update_fields=['status'])

    # Notification WebSocket — groupe des pharmaciens
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        'pharmacists_broadcast',
        {
            'type':      'doctor_status_changed',
            'doctor_id': request.user.id,
            'status':    new_status,
        },
    )

    log_action(request.user, 'DOCTOR_STATUS_CHANGE', f"Nouveau statut : {new_status}")
    return Response({'status': new_status}, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated, IsVerified])
def update_public_key(request):
    """
    Permet à un médecin d'enregistrer ou de mettre à jour sa clé publique RSA
    pour le système de signature des ordonnances (PKI).
    """
    if request.user.role != 'MEDECIN':
        return Response(
            {'detail': 'Seul un médecin peut mettre à jour sa clé publique.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    public_key = request.data.get('public_key', '').strip()

    if not public_key or len(public_key) < 50:
        return Response(
            {'detail': 'Clé publique invalide ou trop courte.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Si c'est du Base64 brut (sans les headers PEM), on l'enveloppe
    if not public_key.startswith('-----BEGIN'):
        # On nettoie les éventuels espaces/newlines pour normaliser
        pk_clean = "".join(public_key.split())
        public_key = f"-----BEGIN PUBLIC KEY-----\n{pk_clean}\n-----END PUBLIC KEY-----"


    try:
        profile = request.user.doctorprofile
    except ObjectDoesNotExist:
        return Response(
            {'detail': 'Profil médecin introuvable pour cet utilisateur.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    profile.public_key = public_key
    profile.save(update_fields=['public_key'])

    log_action(request.user, 'KEY_UPDATE', 'Mise à jour de la clé publique PKI')
    return Response({'ok': True}, status=status.HTTP_200_OK)
