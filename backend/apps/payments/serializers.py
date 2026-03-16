from rest_framework import serializers
from .models         import Payment

class PaymentSerializer(serializers.ModelSerializer):
    medecin_nom  = serializers.SerializerMethodField()
    patient_nom  = serializers.SerializerMethodField()

    class Meta:
        model   = Payment
        fields  = [
            'id', 'consultation_id',
            'montant_total', 'commission', 'honoraires_medecin',
            'status', 'medecin_nom', 'patient_nom',
            'created_at', 'paid_at',
        ]

    def get_medecin_nom(self, obj):
        return f'{obj.medecin.prenom} {obj.medecin.nom}'

    def get_patient_nom(self, obj):
        return obj.consultation.patient_nom