import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.serializers import RegisterSerializer

data = {
    "email": "test@test.com",
    "password": "Password123",
    "nom": "Test",
    "prenom": "User",
    "role": "PHARMACIEN",
    "nom_pharmacie": "Pharmacie Ibn Cina",
    "adresse": "rue 98 tunis",
    # Intentionally leaving out cin_numero and others to see if they default to "" or None
}

serializer = RegisterSerializer(data=data)
print("Is valid?", serializer.is_valid())
print("Errors:", serializer.errors)
if serializer.is_valid():
    print("Validated data keys:", serializer.validated_data.keys())
    for k, v in serializer.validated_data.items():
        if k in ['cin_numero', 'numero_autorisation', 'gouvernorat', 'matricule_fiscal']:
            print(f"{k} = {repr(v)}")
    
    # Let's see what pop returns
    vd = serializer.validated_data
    cin = vd.pop('cin_numero', '')
    print(f"Popped cin_numero = {repr(cin)}")
