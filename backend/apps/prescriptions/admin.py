from django.contrib import admin
from .models import Prescription

@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_patient_name', 'medecin', 'is_valid', 'is_dispensed', 'created_at')
    list_filter = ('is_valid', 'is_dispensed', 'created_at')
    search_fields = ('consultation__patient__nom', 'medecin__nom', 'sha256_hash')
    raw_id_fields = ('consultation', 'medecin')

    def get_patient_name(self, obj):
        return f"{obj.consultation.patient.prenom} {obj.consultation.patient.nom}" if obj.consultation.patient else "Inconnu"
    get_patient_name.short_description = 'Patient'
