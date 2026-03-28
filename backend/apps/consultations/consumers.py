import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class QueueConsumer(AsyncWebsocketConsumer):
    """
    Gère la file d'attente (notifications) pour les médecins et pharmaciens.
    """

    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous:
            await self.close()
            return

        # Rejoindre le groupe spécifique à l'utilisateur pour les notifications directes
        if self.user.role == "MEDECIN":
            self.group_name = f"medecin_{self.user.id}"
        else:
            self.group_name = f"pharmacien_{self.user.id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)

        # Les pharmaciens rejoignent aussi un groupe commun pour voir les statuts des médecins
        if self.user.role == "PHARMACIEN":
            await self.channel_layer.group_add(
                "pharmacists_broadcast", self.channel_name
            )

        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        if (
            hasattr(self, "user")
            and not self.user.is_anonymous
            and self.user.role == "PHARMACIEN"
        ):
            await self.channel_layer.group_discard(
                "pharmacists_broadcast", self.channel_name
            )

    # ── HANDLERS (Appelés par channel_layer.group_send) ────

    async def new_patient(self, event):
        """Notifie le médecin qu'un nouveau patient est dans sa file."""
        await self.send(
            text_data=json.dumps(
                {"type": "new_patient", "payload": event["consultation"]}
            )
        )

    async def consultation_accepted(self, event):
        """Notifie le pharmacien que le médecin a accepté la consultation."""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "consultation_accepted",
                    "payload": {"consultation_id": event["consultation_id"]},
                }
            )
        )

    async def doctor_status_changed(self, event):
        """Notifie les pharmaciens du changement de statut d'un médecin."""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "doctor_status_changed",
                    "payload": {
                        "doctor_id": event["doctor_id"],
                        "status": event["status"],
                    },
                }
            )
        )

    async def prescription_ready(self, event):
        """Notifie le pharmacien que l'ordonnance est prête et signée."""
        await self.send(
            text_data=json.dumps(
                {"type": "prescription_ready", "payload": {"hash": event["hash"]}}
            )
        )


class WebRTCConsumer(AsyncWebsocketConsumer):
    """
    Signaling WebRTC (Offer/Answer/ICE) pour une consultation spécifique.
    """

    async def connect(self):
        user = self.scope["user"]
        if user.is_anonymous:
            await self.close()
            return

        self.consultation_id = self.scope["url_route"]["kwargs"]["id"]

        # Bug VID-1 fix : Vérifier que l'utilisateur est bien autorisé pour cette consultation
        from .models import Consultation
        from channels.db import database_sync_to_async

        try:
            consult = await database_sync_to_async(Consultation.objects.get)(
                pk=self.consultation_id
            )
            if user.id not in (consult.medecin_id, consult.pharmacien_id):
                await self.close()
                return
        except Consultation.DoesNotExist:
            await self.close()
            return

        self.room = f"webrtc_room_{self.consultation_id}"
        await self.channel_layer.group_add(self.room, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "room"):
            await self.channel_layer.group_discard(self.room, self.channel_name)

    async def receive(self, text_data):
        """Relaye le message WebRTC ou chat à l'autre participant de la room."""
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(json.dumps({"error": "Invalid JSON"}))
            return

        msg_type = data.get("type")

        if msg_type == "chat":
            content = data.get("content", "").strip()
            if not content:
                return
            saved_msg = await self.save_chat_message(content)
            await self.channel_layer.group_send(
                self.room,
                {
                    "type": "chat_message",
                    "payload": {
                        "type": "chat",
                        "sender_id": self.user.id,
                        "sender_name": f"{self.user.prenom} {self.user.nom}",
                        "content": content,
                        "timestamp": saved_msg["timestamp"],
                    },
                    "sender_channel_name": self.channel_name,
                },
            )
            return

        if msg_type not in ("offer", "answer", "ice", "ping"):
            return

        await self.channel_layer.group_send(
            self.room,
            {
                "type": "webrtc.signal",
                "payload": data,
                "sender_channel_name": self.channel_name,
            },
        )

    async def save_chat_message(self, content: str) -> dict:
        """Sauvegarde un message de chat dans la base de données."""
        from .models import ChatMessage

        msg = await database_sync_to_async(ChatMessage.objects.create)(
            consultation_id=self.consultation_id,
            sender=self.user,
            content=content,
        )
        return {"id": msg.id, "timestamp": msg.created_at.isoformat()}

    async def chat_message(self, event):
        if self.channel_name != event["sender_channel_name"]:
            await self.send(text_data=json.dumps(event["payload"]))

    async def webrtc_signal(self, event):
        # Ne pas renvoyer le message à celui qui l'a émis
        if self.channel_name != event["sender_channel_name"]:
            await self.send(text_data=json.dumps(event["payload"]))
