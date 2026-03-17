from django.contrib import admin
from .models import Patient, MedicalRecord

class MedicalRecordInline(admin.StackedInline):
    model = MedicalRecord
    can_delete = False
    verbose_name_plural = 'Dossier Médical'

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('prenom', 'nom', 'telephone', 'sexe', 'date_naissance', 'created_at')
    search_fields = ('nom', 'prenom', 'telephone')
    list_filter = ('sexe', 'created_at')
    inlines = (MedicalRecordInline,)

@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = ('patient', 'groupe_sanguin', 'derniere_mise_a_jour')
    search_fields = ('patient__nom', 'patient__prenom')
