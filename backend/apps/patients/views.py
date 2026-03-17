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
        query = self.request.query_params.get('search', None)
        if query:
            return Patient.objects.filter(
                models.Q(nom__icontains=query) | 
                models.Q(telephone__icontains=query)
            )
        return Patient.objects.all().order_by('-created_at')

    @action(detail=True, methods=['get'])
    def medical_record(self, request, pk=None):
        patient = self.get_object()
        record, created = MedicalRecord.objects.get_or_create(patient=patient)
        return Response(MedicalRecordSerializer(record).data)
