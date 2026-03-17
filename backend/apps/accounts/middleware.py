from channels.db                import database_sync_to_async
from django.contrib.auth         import get_user_model
from django.contrib.auth.models  import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from urllib.parse                import parse_qs

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token):
    try:
        access_token = AccessToken(token)
        user_id      = access_token['user_id']
        return User.objects.get(id=user_id)
    except Exception:
        return AnonymousUser()

class JwtAuthMiddleware:
    """
    Middleware personnalisé pour authentifier les WebSockets via JWT dans l'URL.
    Usage: ws://.../?token=ACCESS_TOKEN
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token        = query_params.get('token', [None])[0]

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await self.app(scope, receive, send)
