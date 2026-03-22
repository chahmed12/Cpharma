import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# --- Monkey patch pour django-fernet-fields-v2 (compatibilité Django 4+) ---
import django.utils.encoding
if not hasattr(django.utils.encoding, 'force_text'):
    django.utils.encoding.force_text = django.utils.encoding.force_str
# ---------------------------------------------------------------------------

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
