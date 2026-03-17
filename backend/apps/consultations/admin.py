from django.contrib import admin
from .models import Consultation

@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_patient_name', 'medecin', 'pharmacien', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('patient__nom', 'patient__prenom', 'medecin__nom', 'pharmacien__nom')
    raw_id_fields = ('patient', 'medecin', 'pharmacien')

    def get_patient_name(self, obj):
        return f"{obj.patient.prenom} {obj.patient.nom}" if obj.patient else "Inconnu"
    get_patient_name.short_description = 'Patient'
