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
        # Les médecins voient leurs consultations en attente
        if user.role == 'MEDECIN':
            return Consultation.objects.filter(medecin=user, status='PENDING')
        # Les pharmaciens voient toutes les consultations qu'ils ont initiées
        return Consultation.objects.filter(pharmacien=user)

    def perform_create(self, serializer):
        # Récupérer l'ID du patient envoyé par le front
        patient_id = self.request.data.get('patient_id')
        consultation = serializer.save(
            pharmacien=self.request.user,
            patient_id=patient_id
        )
        
        # NOTIFICATION WEBSOCKET : Alerter le médecin ciblé avec infos patient
        async_to_sync(channel_layer.group_send)(
            f'medecin_{consultation.medecin_id}',
            {
                'type': 'new_patient',
                'consultation': ConsultationSerializer(consultation).data
            }
        )

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        consultation = self.get_object()
        new_status   = request.data.get('status')
        
        if new_status not in dict(Consultation.Status.choices):
            return Response({'error': 'Statut invalide'}, status=400)
            
        consultation.status = new_status
        consultation.save()

        # Si la consultation devient active, on prévient le pharmacien
        if new_status == 'ACTIVE':
            async_to_sync(channel_layer.group_send)(
                f'pharmacien_{consultation.pharmacien_id}',
                {
                    'type': 'consultation_accepted',
                    'consultation_id': consultation.id,
                }
            )
        return Response(ConsultationSerializer(consultation).data)

    @action(detail=False, methods=['get'], url_path='queue')
    def queue(self, request):
        """Endpoint explicite pour la file d'attente du médecin."""
        qs = Consultation.objects.filter(
            medecin=request.user,
            status='PENDING'
        ).order_by('created_at')
        return Response(ConsultationSerializer(qs, many=True).data)
