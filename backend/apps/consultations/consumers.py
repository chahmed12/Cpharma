import json
from channels.generic.websocket import AsyncWebsocketConsumer

class QueueConsumer(AsyncWebsocketConsumer):
    """
    Gère la file d'attente (notifications) pour les médecins et pharmaciens.
    """
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_anonymous:
            await self.close()
            return

        # Rejoindre le groupe spécifique à l'utilisateur pour les notifications directes
        if self.user.role == 'MEDECIN':
            self.group_name = f'medecin_{self.user.id}'
        else:
            self.group_name = f'pharmacien_{self.user.id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        
        # Les pharmaciens rejoignent aussi un groupe commun pour voir les statuts des médecins
        if self.user.role == 'PHARMACIEN':
            await self.channel_layer.group_add('pharmacists_broadcast', self.channel_name)
            
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        if self.user.role == 'PHARMACIEN':
            await self.channel_layer.group_discard('pharmacists_broadcast', self.channel_name)

    # ── HANDLERS (Appelés par channel_layer.group_send) ────

    async def new_patient(self, event):
        """Notifie le médecin qu'un nouveau patient est dans sa file."""
        await self.send(text_data=json.dumps({
            'type': 'new_patient',
            'payload': event['consultation']
        }))

    async def consultation_accepted(self, event):
        """Notifie le pharmacien que le médecin a accepté la consultation."""
        await self.send(text_data=json.dumps({
            'type': 'consultation_accepted',
            'payload': {'consultation_id': event['consultation_id']}
        }))

    async def doctor_status_changed(self, event):
        """Notifie les pharmaciens du changement de statut d'un médecin."""
        await self.send(text_data=json.dumps({
            'type': 'doctor_status_changed',
            'payload': {
                'doctor_id': event['doctor_id'],
                'status':    event['status']
            }
        }))


class WebRTCConsumer(AsyncWebsocketConsumer):
    """
    Signaling WebRTC (Offer/Answer/ICE) pour une consultation spécifique.
    """
    async def connect(self):
        self.consultation_id = self.scope['url_route']['kwargs']['id']
        self.room            = f'webrtc_room_{self.consultation_id}'
        
        await self.channel_layer.group_add(self.room, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.room, self.channel_name)

    async def receive(self, text_data):
        """Relaye le message WebRTC à l'autre participant de la room."""
        data = json.loads(text_data)
        
        # On renvoie le message brut à tout le groupe SAUF à l'envoyeur
        await self.channel_layer.group_send(
            self.room,
            {
                'type': 'webrtc.signal',
                'payload': data,
                'sender_channel_name': self.channel_name
            }
        )

    async def webrtc_signal(self, event):
        # Ne pas renvoyer le message à celui qui l'a émis
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps(event['payload']))
