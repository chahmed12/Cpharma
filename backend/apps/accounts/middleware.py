from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from urllib.parse import parse_qs

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token):
    try:
        access_token = AccessToken(token)
        user_id = access_token["user_id"]
        return User.objects.get(id=user_id)
    except Exception:
        return AnonymousUser()


from django.conf import settings


class JwtAuthMiddleware:
    """
    Middleware personnalisé pour authentifier les WebSockets via JWT.
    Priorité: Cookie HttpOnly (SOL-SEC-8), Fallback: Query String (?token=...)
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # 1. On cherche d'abord dans les cookies (Méthode sécurisée)
        cookies = scope.get("headers", [])
        cookie_header = next((v for k, v in cookies if k == b"cookie"), b"").decode()

        token = None
        if cookie_header:
            from http.cookies import SimpleCookie

            cookie = SimpleCookie(cookie_header)
            if settings.AUTH_COOKIE in cookie:
                token = cookie[settings.AUTH_COOKIE].value

        # 2. Fallback sur la query string UNIQUEMENT en DEBUG
        if not token and settings.DEBUG:
            query_string = scope.get("query_string", b"").decode()
            query_params = parse_qs(query_string)
            token = query_params.get("token", [None])[0]
            if token:
                import logging

                logger = logging.getLogger(__name__)
                logger.warning("WS auth via query string — dev only!")

        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()

        return await self.app(scope, receive, send)
