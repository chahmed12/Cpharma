from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    medecin_nom = serializers.SerializerMethodField()
    patient_nom = serializers.SerializerMethodField()
    medecin_email = serializers.SerializerMethodField()
    consultation_date = serializers.SerializerMethodField()
    medecin_specialite = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "consultation_id",
            "montant_total",
            "commission",
            "honoraires_medecin",
            "status",
            "medecin_nom",
            "medecin_email",
            "medecin_specialite",
            "patient_nom",
            "consultation_date",
            "created_at",
            "paid_at",
        ]

    def get_medecin_nom(self, obj):
        return f"{obj.medecin.prenom} {obj.medecin.nom}"

    def get_medecin_email(self, obj):
        return obj.medecin.email

    def get_medecin_specialite(self, obj):
        dp = getattr(obj.medecin, "doctorprofile", None)
        return dp.specialite if dp else ""

    def get_patient_nom(self, obj):
        p = getattr(obj.consultation, "patient", None)
        if p:
            return f"{p.prenom} {p.nom}".strip()
        return ""

    def get_consultation_date(self, obj):
        return obj.consultation.created_at if obj.consultation else None
