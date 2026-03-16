import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db                import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth         import get_user_model

User = get_user_model()


# ── QueueConsumer (inchangé depuis phase ②) ───────────
class QueueConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        token_str = self.scope['query_string'].decode().split('token=')[-1]
        try:
            token   = AccessToken(token_str)
            user_id = token['user_id']
            self.user = await database_sync_to_async(
                User.objects.get)(id=user_id)
        except Exception:
            await self.close(); return
        self.group_name = f'{self.user.role.lower()}_{self.user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        msg = json.loads(text_data)
        await self.channel_layer.group_send(
            msg['target_group'],
            {'type': 'queue.event', 'payload': msg}
        )

    async def queue_event(self, event):
        await self.send(text_data=json.dumps(event['payload']))


# ── WebRTCConsumer (signaling complet) ────────────────
class WebRTCConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.consultation_id = self.scope['url_route']['kwargs']['id']
        self.room            = f'webrtc_{self.consultation_id}'
        await self.channel_layer.group_add(self.room, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.room, self.channel_name)
        # Notifier l'autre pair que la connexion est fermée
        await self.channel_layer.group_send(
            self.room,
            {'type': 'webrtc.signal',
             'data': json.dumps({
                'type': 'hangup',
                'sender_channel': self.channel_name
             }),
             'sender_channel': self.channel_name}
        )

    async def receive(self, text_data):
        # Relay brut vers tous les membres du groupe
        msg = json.loads(text_data)
        # Filtrage : on n'envoie pas le signal WebRTC via ws/queue/
        # mais directement via ws/webrtc/{id}/ — pas besoin de target_group
        await self.channel_layer.group_send(
            self.room,
            {
                'type':           'webrtc.signal',
                'data':           text_data,
                'sender_channel': self.channel_name,
            }
        )

    async def webrtc_signal(self, event):
        # Ne pas renvoyer à l'expéditeur
        if event.get('sender_channel') == self.channel_name:
            return
        await self.send(text_data=event['data'])