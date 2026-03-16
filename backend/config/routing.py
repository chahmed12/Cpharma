from django.urls import re_path
from consultations import consumers

websocket_urlpatterns = [
    re_path(r'^ws/queue/$',               consumers.QueueConsumer.as_asgi()),
    re_path(r'^ws/webrtc/(?P<id>\d+)/$',   consumers.WebRTCConsumer.as_asgi()),
]