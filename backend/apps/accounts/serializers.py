from rest_framework             import serializers
from django.contrib.auth.hashers import make_password
from .models                     import CustomUser, DoctorProfile, PharmacistProfile


class RegisterSerializer(serializers.ModelSerializer):
    password       = serializers.CharField(write_only=True, min_length=6)
    nom_pharmacie  = serializers.CharField(required=False, allow_blank=True)
    specialite     = serializers.CharField(required=False, allow_blank=True)
    numero_ordre   = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model  = CustomUser
        fields = ['email', 'password', 'nom', 'prenom', 'role',
                  'specialite', 'numero_ordre', 'nom_pharmacie']

    def create(self, validated):
        specialite    = validated.pop('specialite',    '')
        numero_ordre  = validated.pop('numero_ordre',  '')
        nom_pharmacie = validated.pop('nom_pharmacie', '')
        validated['username'] = validated['email']
        validated['password'] = make_password(validated['password'])
        user = super().create(validated)

        if user.role == 'MEDECIN':
            DoctorProfile.objects.create(
                user=user, specialite=specialite, numero_ordre=numero_ordre
            )
        elif user.role == 'PHARMACIEN':
            PharmacistProfile.objects.create(
                user=user, nom_pharmacie=nom_pharmacie
            )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CustomUser
        fields = ['id', 'email', 'nom', 'prenom', 'role']


class DoctorListSerializer(serializers.ModelSerializer):
    nom        = serializers.CharField(source='user.nom')
    prenom     = serializers.CharField(source='user.prenom')
    id         = serializers.IntegerField(source='user.id')

    class Meta:
        model  = DoctorProfile
        fields = ['id', 'nom', 'prenom', 'specialite', 'status', 'tarif_consultation']