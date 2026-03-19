from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Patient, MedicalRecord
from .serializers import PatientSerializer, MedicalRecordSerializer

class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            qs = Patient.objects.all()
        elif user.role == 'PHARMACIEN':
            qs = Patient.objects.filter(consultations__pharmacien=user).distinct()
        elif user.role == 'MEDECIN':
            qs = Patient.objects.filter(consultations__medecin=user).distinct()
        else:
            qs = Patient.objects.none()

        query = self.request.query_params.get('search', None)
        if query:
            qs = qs.filter(
                models.Q(nom__icontains=query) | 
                models.Q(telephone__icontains=query)
            )
        return qs.order_by('-created_at')

    @action(detail=True, methods=['get'])
    def medical_record(self, request, pk=None):
        patient = self.get_object()
        record, created = MedicalRecord.objects.get_or_create(patient=patient)
        return Response(MedicalRecordSerializer(record).data)
