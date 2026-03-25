from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import IsVerified
from asgiref.sync import async_to_sync
from .models import Consultation
from .serializers import ConsultationSerializer


class ConsultationViewSet(viewsets.ModelViewSet):
    serializer_class = ConsultationSerializer
    permission_classes = [IsAuthenticated, IsVerified]

    def get_queryset(self):
        user = self.request.user
        queryset = Consultation.objects.select_related(
            "patient", "medecin", "pharmacien"
        )
        if user.role == "ADMIN":
            return queryset.all()
        if user.role == "MEDECIN":
            queryset = queryset.filter(medecin=user)
        else:
            queryset = queryset.filter(pharmacien=user)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            statuses = [s.strip() for s in status_filter.split(",")]
            queryset = queryset.filter(status__in=statuses)
        return queryset

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied, ValidationError

        if self.request.user.role != "PHARMACIEN":
            raise PermissionDenied("Seul un pharmacien peut créer une consultation.")

        patient_id = self.request.data.get("patient_id")
        # Bug A1 fix: patient_id obligatoire pour éviter consultation.patient==None
        if not patient_id:
            raise ValidationError({"patient_id": "Ce champ est obligatoire."})
        consultation = serializer.save(
            pharmacien=self.request.user, patient_id=patient_id
        )
        consultation = Consultation.objects.select_related(
            "patient__medical_record", "medecin"
        ).get(pk=consultation.pk)

        # NOTIFICATION WEBSOCKET : Alerter le médecin ciblé avec infos patient
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"medecin_{consultation.medecin_id}",
            {
                "type": "new_patient",
                "consultation": ConsultationSerializer(consultation).data,
            },
        )

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        consultation = self.get_object()
        user = request.user
        new_status = request.data.get("status")

        if user.id not in (consultation.medecin_id, consultation.pharmacien_id):
            return Response({"error": "Non autorisé"}, status=status.HTTP_403_FORBIDDEN)

        VALID_TRANSITIONS = {
            "PENDING": ["ACTIVE", "CANCELLED"],
            "ACTIVE": ["COMPLETED", "CANCELLED"],
        }
        if new_status not in VALID_TRANSITIONS.get(consultation.status, []):
            return Response(
                {"error": "Transition non autorisée"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status not in dict(Consultation.Status.choices):
            return Response(
                {"error": "Statut invalide"}, status=status.HTTP_400_BAD_REQUEST
            )
        from django.db import transaction

        # Bug PAY-1 fix : Transaction atomique pour garantir la cohérence
        with transaction.atomic():
            consultation.status = new_status
            consultation.save()

        if new_status == "ACTIVE":
            from channels.layers import get_channel_layer

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"pharmacien_{consultation.pharmacien_id}",
                {
                    "type": "consultation_accepted",
                    "consultation_id": consultation.id,
                },
            )

        return Response(ConsultationSerializer(consultation).data)

    @action(detail=False, methods=["get"], url_path="queue")
    def queue(self, request):
        """Endpoint explicite pour la file d'attente du médecin."""
        qs = Consultation.objects.filter(
            medecin=request.user, status="PENDING"
        ).order_by("created_at")
        return Response(ConsultationSerializer(qs, many=True).data)
