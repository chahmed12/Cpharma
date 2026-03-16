from rest_framework          import viewsets, permissions, status
from rest_framework.response  import Response
from rest_framework.decorators import action
from channels.layers          import get_channel_layer
from asgiref.sync             import async_to_sync
from .models                  import Consultation
from .serializers             import ConsultationSerializer

channel_layer = get_channel_layer()

class ConsultationViewSet(viewsets.ModelViewSet):
    serializer_class   = ConsultationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'MEDECIN':
            return Consultation.objects.filter(medecin=user, status='PENDING')
        return Consultation.objects.filter(pharmacien=user)

    def perform_create(self, serializer):
        consultation = serializer.save(pharmacien=self.request.user)
        # Notifier le médecin via WebSocket dès la création
        async_to_sync(channel_layer.group_send)(
            f'medecin_{consultation.medecin_id}',
            {
                'type':    'queue.event',
                'payload': {
                    'type':            'new_patient',
                    'consultation_id': consultation.id,
                    'patient_nom':     consultation.patient_nom,
                    'motif':           consultation.motif,
                }
            }
        )

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        consultation = self.get_object()
        new_status   = request.data.get('status')
        consultation.status = new_status
        consultation.save()

        if new_status == 'ACTIVE':
            # Notifier le pharmacien que le médecin a accepté
            async_to_sync(channel_layer.group_send)(
                f'pharmacien_{consultation.pharmacien_id}',
                {
                    'type':    'queue.event',
                    'payload': {
                        'type':            'consultation_accepted',
                        'consultation_id': consultation.id,
                    }
                }
            )
        return Response(ConsultationSerializer(consultation).data)