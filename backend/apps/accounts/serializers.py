"""
accounts/serializers.py
=======================
Sérialiseurs pour l'inscription, la représentation des utilisateurs
et la liste des médecins.
"""

from django.contrib.auth.hashers    import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions          import ValidationError as DjangoValidationError
from django.core.files.uploadedfile  import InMemoryUploadedFile
from rest_framework                  import serializers
from .models                         import CustomUser, DoctorProfile, PharmacistProfile
from PIL import Image
import io


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
        min_length=10,
        style={'input_type': 'password'},
    )
    nom_pharmacie   = serializers.CharField(required=False, allow_blank=True, default='')
    specialite      = serializers.CharField(required=False, allow_blank=True, default='')
    numero_ordre    = serializers.CharField(required=False, allow_blank=True, default='')
    image           = serializers.ImageField(required=False, allow_null=True, default=None)

    class Meta:
        model  = CustomUser
        fields = [
            'email', 'password', 'nom', 'prenom', 'role',
            'specialite', 'numero_ordre', 'nom_pharmacie', 'image',
        ]

    # ── Validateurs champ par champ ───────────────────────────────────────────

    def validate_image(self, value):
        if value:
            # Check content type
            if value.content_type not in ['image/jpeg', 'image/png', 'image/webp']:
                raise serializers.ValidationError("Format non supporté. Utilisez JPG, PNG ou WebP.")
            # Check size (max 5 MB)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("L'image ne doit pas dépasser 5 Mo.")
                
            # Resize image with Pillow
            try:
                img = Image.open(value)
                if img.mode != 'RGB' and value.content_type == 'image/jpeg':
                    img = img.convert('RGB')
                
                # Resize keeping aspect ratio max 400x400
                img.thumbnail((400, 400), Image.Resampling.LANCZOS)
                
                output = io.BytesIO()
                format_map = {'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WEBP'}
                img_format = format_map.get(value.content_type, 'JPEG')
                
                img.save(output, format=img_format, quality=85)
                output.seek(0)
                
                return InMemoryUploadedFile(
                    output, 
                    'ImageField',
                    value.name,
                    value.content_type,
                    output.tell(),
                    None
                )
            except Exception:
                raise serializers.ValidationError("Erreur lors du traitement de l'image.")
        return value

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
        specialite    = validated_data.pop('specialite',    '')
        numero_ordre  = validated_data.pop('numero_ordre',  '')
        nom_pharmacie = validated_data.pop('nom_pharmacie', '')
        image         = validated_data.pop('image',         None)

        validated_data['username'] = validated_data['email']
        validated_data['password'] = make_password(validated_data['password'])
        validated_data['is_verified'] = False

        user = CustomUser.objects.create(**validated_data)

        if user.role == CustomUser.Role.MEDECIN:
            DoctorProfile.objects.create(
                user=user,
                specialite=specialite,
                numero_ordre=numero_ordre,
                photo=image,
            )
        elif user.role == CustomUser.Role.PHARMACIEN:
            PharmacistProfile.objects.create(
                user=user,
                nom_pharmacie=nom_pharmacie,
                photo_pharmacie=image,
            )

        return user


class UserSerializer(serializers.ModelSerializer):
    """
    Représentation publique d'un utilisateur.
    Retourné après login, register et sur /auth/me/.
    """
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model        = CustomUser
        fields       = ['id', 'email', 'nom', 'prenom', 'role', 'is_verified', 'photo_url']
        read_only_fields = fields  # Lecture seule : cet objet ne sert qu'à la réponse

    def get_photo_url(self, obj):
        request = self.context.get('request')
        if obj.role == 'MEDECIN' and hasattr(obj, 'doctorprofile') and obj.doctorprofile.photo:
            url = obj.doctorprofile.photo.url
            return request.build_absolute_uri(url) if request else url
        elif obj.role == 'PHARMACIEN' and hasattr(obj, 'pharmacistprofile') and obj.pharmacistprofile.photo_pharmacie:
            url = obj.pharmacistprofile.photo_pharmacie.url
            return request.build_absolute_uri(url) if request else url
        return None


class DoctorListSerializer(serializers.ModelSerializer):
    """
    Représentation publique d'un profil médecin, avec les infos de l'utilisateur
    associé aplaties au même niveau.
    """
    nom    = serializers.CharField(source='user.nom',    read_only=True)
    prenom = serializers.CharField(source='user.prenom', read_only=True)
    id     = serializers.IntegerField(source='user.id',  read_only=True)
    photo  = serializers.SerializerMethodField()

    def get_photo(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
        return None

    class Meta:
        model  = DoctorProfile
        fields = ['id', 'nom', 'prenom', 'specialite', 'status', 'tarif_consultation', 'photo']
        read_only_fields = fields