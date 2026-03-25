from rest_framework import serializers
from .models import Prescription


class OrdonnanceDataSerializer(serializers.Serializer):
    medicaments = serializers.ListField(
        child=serializers.DictField(), required=True, allow_empty=False
    )
    posologie = serializers.CharField(required=True)
    duree_traitement = serializers.CharField(required=False, allow_blank=True)
    instructions = serializers.CharField(required=False, allow_blank=True)


class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = [
            "id",
            "medecin",
            "consultation",
            "ordonnance_data",
            "sha256_hash",
            "is_valid",
            "is_dispensed",
            "created_at",
        ]
        read_only_fields = ["id", "is_valid", "created_at"]
