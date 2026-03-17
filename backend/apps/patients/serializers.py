from rest_framework import serializers
from .models import Patient, MedicalRecord

class MedicalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecord
        fields = ['allergies', 'antecedents', 'groupe_sanguin', 'poids', 'taille', 'derniere_mise_a_jour']

class PatientSerializer(serializers.ModelSerializer):
    medical_record = MedicalRecordSerializer(required=False)

    class Meta:
        model = Patient
        fields = ['id', 'nom', 'prenom', 'telephone', 'date_naissance', 'sexe', 'adresse', 'medical_record']

    def create(self, validated_data):
        medical_record_data = validated_data.pop('medical_record', {})
        patient = Patient.objects.create(**validated_data)
        MedicalRecord.objects.create(patient=patient, **medical_record_data)
        return patient

    def update(self, instance, validated_data):
        medical_record_data = validated_data.pop('medical_record', {})
        # Mise à jour du patient
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        # Mise à jour ou création du dossier médical
        MedicalRecord.objects.update_or_create(patient=instance, defaults=medical_record_data)
        return instance
