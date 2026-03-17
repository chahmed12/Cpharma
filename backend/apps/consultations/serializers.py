from rest_framework import serializers
from .models import Consultation
from apps.patients.serializers import PatientSerializer

class ConsultationSerializer(serializers.ModelSerializer):
    # On peut soit envoyer l'ID du patient, soit créer un patient à la volée
    patient_details = PatientSerializer(source='patient', read_only=True)
    patient_id      = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model  = Consultation
        fields = [
            'id', 'medecin', 'pharmacien',
            'patient_id', 'patient_details',
            'motif', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'pharmacien', 'created_at']

    def validate_medecin(self, value):
        if value.role != 'MEDECIN':
            raise serializers.ValidationError("L'utilisateur n'est pas un médecin.")
        return value
