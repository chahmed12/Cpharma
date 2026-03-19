import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.patients.serializers import PatientSerializer

data = {
    'nom': 'Test',
    'prenom': 'User',
    'telephone': '0550000000',
    'date_naissance': '1990-01-01',
    'sexe': 'M',
    'medical_record': {'allergies': '', 'antecedents': '', 'groupe_sanguin': ''}
}

s = PatientSerializer(data=data)
if not s.is_valid():
    print("ERRORS:", s.errors)
else:
    print("VALID! Payload:", s.validated_data)
