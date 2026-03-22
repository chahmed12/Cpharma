"""
accounts/serializers.py
=======================
Sérialiseurs pour l'inscription, la représentation des utilisateurs
et la liste des médecins.
"""

from django.contrib.auth.hashers    import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions          import ValidationError as DjangoValidationError
from rest_framework                  import serializers
from .models                         import CustomUser, DoctorProfile, PharmacistProfile


class RegisterSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la création d'un nouveau compte utilisateur.

    Règles :
    - Le mot de passe doit satisfaire tous les AUTH_PASSWORD_VALIDATORS de settings.py
      (min 10 caractères, pas de mot de passe commun, pas que des chiffres).
    - Seuls les rôles MEDECIN et PHARMACIEN sont autorisés via l'API publique.
    - Le compte est créé avec is_verified=False (approbation admin requise).
    - Les champs de profil (specialite, numero_ordre, nom_pharmacie) sont facultatifs
      selon le rôle, mais le profil associé est toujours créé.
    """
    password      = serializers.CharField(
        write_only=True,
        min_length=10,           # Cohérent avec MinimumLengthValidator dans settings.py
        style={'input_type': 'password'},
    )
    nom_pharmacie = serializers.CharField(required=False, allow_blank=True, default='')
    specialite    = serializers.CharField(required=False, allow_blank=True, default='')
    numero_ordre  = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model  = CustomUser
        fields = [
            'email', 'password', 'nom', 'prenom', 'role',
            'specialite', 'numero_ordre', 'nom_pharmacie',
        ]

    # ── Validateurs champ par champ ───────────────────────────────────────────

    def validate_role(self, value: str) -> str:
        """Interdit la création de comptes ADMIN via l'API publique."""
        if value not in (CustomUser.Role.MEDECIN, CustomUser.Role.PHARMACIEN):
            raise serializers.ValidationError(
                "Rôle invalide. Les valeurs acceptées sont : MEDECIN, PHARMACIEN."
            )
        return value

    def validate_password(self, value: str) -> str:
        """
        Déclenche tous les AUTH_PASSWORD_VALIDATORS configurés dans settings.py
        en plus du min_length déclaré sur le champ.
        """
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    def validate_email(self, value: str) -> str:
        """Normalise l'adresse e-mail en minuscules."""
        return value.strip().lower()

    # ── Création ──────────────────────────────────────────────────────────────

    def create(self, validated_data: dict) -> CustomUser:
        # Extraire les champs de profil avant de créer l'utilisateur
        specialite    = validated_data.pop('specialite',    '')
        numero_ordre  = validated_data.pop('numero_ordre',  '')
        nom_pharmacie = validated_data.pop('nom_pharmacie', '')

        # Django AbstractUser exige un username ; on utilise l'email
        validated_data['username'] = validated_data['email']
        validated_data['password'] = make_password(validated_data['password'])

        # Le compte est inactif jusqu'à validation admin
        validated_data['is_verified'] = False

        user = CustomUser.objects.create(**validated_data)

        # Création du profil métier associé
        if user.role == CustomUser.Role.MEDECIN:
            DoctorProfile.objects.create(
                user=user,
                specialite=specialite,
                numero_ordre=numero_ordre,
            )
        elif user.role == CustomUser.Role.PHARMACIEN:
            PharmacistProfile.objects.create(
                user=user,
                nom_pharmacie=nom_pharmacie,
            )

        return user


class UserSerializer(serializers.ModelSerializer):
    """
    Représentation publique d'un utilisateur.
    Retourné après login, register et sur /auth/me/.
    """
    class Meta:
        model        = CustomUser
        fields       = ['id', 'email', 'nom', 'prenom', 'role', 'is_verified']
        read_only_fields = fields  # Lecture seule : cet objet ne sert qu'à la réponse


class DoctorListSerializer(serializers.ModelSerializer):
    """
    Représentation publique d'un profil médecin, avec les infos de l'utilisateur
    associé aplaties au même niveau.
    """
    nom    = serializers.CharField(source='user.nom',    read_only=True)
    prenom = serializers.CharField(source='user.prenom', read_only=True)
    id     = serializers.IntegerField(source='user.id',  read_only=True)

    class Meta:
        model  = DoctorProfile
        fields = ['id', 'nom', 'prenom', 'specialite', 'status', 'tarif_consultation']
        read_only_fields = fields