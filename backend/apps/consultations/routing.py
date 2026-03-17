from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # File d'attente et notifications globales
    re_path(r'ws/queue/$', consumers.QueueConsumer.as_asgi()),
    
    # Canal dédié au signaling WebRTC pour une consultation spécifique
    re_path(r'ws/webrtc/(?P<id>\d+)/$', consumers.WebRTCConsumer.as_asgi()),
]
