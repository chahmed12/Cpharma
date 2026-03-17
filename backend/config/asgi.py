import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.asgi       import get_asgi_application
from channels.routing       import ProtocolTypeRouter, URLRouter
from apps.accounts.middleware import JwtAuthMiddleware
from apps.consultations.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': JwtAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})
