from rest_framework import serializers
from .models         import Prescription

class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Prescription
        fields = [
            'id', 'medecin', 'consultation',
            'ordonnance_data', 'sha256_hash',
            'is_valid', 'is_dispensed', 'created_at',
        ]
        read_only_fields = ['id', 'is_valid', 'created_at']
        # signature exclue des réponses par sécurité