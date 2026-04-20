from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.core.permissions import IsVerified
from .models import Patient, MedicalRecord
from .serializers import PatientSerializer, MedicalRecordSerializer


class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated, IsVerified]

    def create(self, request, *args, **kwargs):
        telephone = request.data.get('telephone')
        if telephone:
            existing_patient = Patient.objects.filter(telephone=telephone).first()
            if existing_patient:
                # Si le patient existe déjà, le renvoyer plutôt que lever une erreur d'unicité
                # Ceci permet au pharmacien de continuer avec ce patient
                serializer = self.get_serializer(existing_patient)
                return Response(serializer.data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            if self.request.user.role != "PHARMACIEN":
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied("Seul un pharmacien peut modifier les patients.")
            return [permissions.IsAuthenticated(), IsVerified()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN":
            qs = Patient.objects.all().select_related("medical_record")
        elif user.role == "PHARMACIEN":
            qs = (
                Patient.objects.filter(consultations__pharmacien=user)
                .select_related("medical_record")
                .distinct()
            )
        elif user.role == "MEDECIN":
            qs = (
                Patient.objects.filter(consultations__medecin=user)
                .select_related("medical_record")
                .distinct()
            )
        else:
            qs = Patient.objects.none()

        query = self.request.query_params.get("search", None)
        if query:
            qs = qs.filter(
                models.Q(nom__icontains=query) | models.Q(telephone__icontains=query)
            )
        return qs.order_by("-created_at")

    @action(detail=True, methods=["get"])
    def medical_record(self, request, pk=None):
        patient = self.get_object()
        record, created = MedicalRecord.objects.get_or_create(patient=patient)
        return Response(MedicalRecordSerializer(record).data)
