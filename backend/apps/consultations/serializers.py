# apps/consultations/serializers.py

from rest_framework import serializers
from .models import Consultation


class ConsultationSerializer(serializers.ModelSerializer):

    # Champs calculés pour le frontend
    patient = serializers.SerializerMethodField()

    class Meta:
        model  = Consultation
        fields = [
            'id', 'medecin', 'pharmacien',
            'patient',
            'patient_nom', 'patient_age', 'patient_sexe', 'patient_motif',
            'status', 'created_at',
        ]
        read_only_fields = ['id', 'pharmacien', 'created_at']

    def get_patient(self, obj):
        """Regroupe les infos patient dans un objet pour le frontend."""
        return {
            'nom':   obj.patient_nom,
            'age':   obj.patient_age,
            'sexe':  obj.patient_sexe,
            'motif': obj.patient_motif,
        }

    def validate_medecin(self, value):
        """Vérifie que l'utilisateur ciblé est bien un médecin."""
        if value.role != 'MEDECIN':
            raise serializers.ValidationError(
                "L'utilisateur sélectionné n'est pas un médecin."
            )
        return value