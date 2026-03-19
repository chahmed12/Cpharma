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
        if user.role == 'ADMIN':
            return Consultation.objects.all()
        # Les médecins et pharmaciens voient l'historique de toutes leurs consultations
        if user.role == 'MEDECIN':
            return Consultation.objects.filter(medecin=user)
        return Consultation.objects.filter(pharmacien=user)

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied, ValidationError

        if self.request.user.role != 'PHARMACIEN':
            raise PermissionDenied("Seul un pharmacien peut créer une consultation.")

        patient_id = self.request.data.get('patient_id')
        # Bug A1 fix: patient_id obligatoire pour éviter consultation.patient==None
        if not patient_id:
            raise ValidationError({'patient_id': 'Ce champ est obligatoire.'})
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
        from django.db import transaction

        # Bug PAY-1 fix : Transaction atomique pour garantir la cohérence
        with transaction.atomic():
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
