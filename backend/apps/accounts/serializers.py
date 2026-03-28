"""
accounts/serializers.py
=======================
Sérialiseurs pour l'inscription, la représentation des utilisateurs
et la liste des médecins.
"""

from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import CustomUser, DoctorProfile, PharmacistProfile


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=10,
        style={"input_type": "password"},
    )
    nom_pharmacie = serializers.CharField(required=False, allow_blank=True, default="")
    adresse = serializers.CharField(required=False, allow_blank=True, default="")
    specialite = serializers.CharField(required=False, allow_blank=True, default="")
    numero_ordre = serializers.CharField(required=False, allow_blank=True, default="")
    tarif_consultation = serializers.DecimalField(
        required=False, max_digits=8, decimal_places=2, default="50.00"
    )
    image = serializers.ImageField(required=False, allow_null=True, default=None)
    
    # Nouveaux champs pour les médecins & pharmaciens
    cin_numero = serializers.CharField(required=False, allow_blank=True, default="")
    gouvernorat = serializers.CharField(required=False, allow_blank=True, default="")
    document_cin = serializers.FileField(required=False, allow_null=True, default=None)
    document_cnom = serializers.FileField(required=False, allow_null=True, default=None)
    
    # Nouveaux champs pour pharmaciens
    numero_autorisation = serializers.CharField(required=False, allow_blank=True)
    matricule_fiscal = serializers.CharField(required=False, allow_blank=True)
    document_autorisation = serializers.FileField(required=False)
    document_patente = serializers.FileField(required=False)

    # Nouveaux champs pour le traçage légal
    cgu_version = serializers.CharField(write_only=True, required=False)
    contrat_version = serializers.CharField(write_only=True, required=False)
    confidentialite_version = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = [
            "email",
            "password",
            "nom",
            "prenom",
            "role",
            "specialite",
            "numero_ordre",
            "tarif_consultation",
            "nom_pharmacie",
            "adresse",
            "image",
            "cin_numero",
            "gouvernorat",
            "document_cin",
            "document_cnom",
            "numero_autorisation",
            "matricule_fiscal",
            "document_autorisation",
            "document_patente",
        ]

    # ── Validateurs champ par champ ───────────────────────────────────────────

    def validate(self, data):
        # Vérifier que l'email a été validé par OTP
        email = data.get("email", "").strip().lower()
        if email:
            from django.core.cache import cache
            is_verified = cache.get(f"otp_verified_{email}")
            if not is_verified:
                raise serializers.ValidationError({"email": "L'adresse email n'a pas été vérifiée par OTP."})
        return data

    def validate_image(self, value):
        if value:
            from apps.core.services.image_service import (
                validate_image_file,
                ImageProcessingError,
            )

            try:
                return validate_image_file(value)
            except ImageProcessingError as e:
                raise serializers.ValidationError(str(e))
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
        specialite = validated_data.pop("specialite", "")
        numero_ordre = validated_data.pop("numero_ordre", "")
        tarif_consultation = validated_data.pop("tarif_consultation", "50.00")
        nom_pharmacie = validated_data.pop("nom_pharmacie", "")
        adresse = validated_data.pop("adresse", "")
        image = validated_data.pop("image", None)
        
        cin_numero = validated_data.pop("cin_numero", "")
        gouvernorat = validated_data.pop("gouvernorat", "")
        document_cin = validated_data.pop("document_cin", None)
        document_cnom = validated_data.pop("document_cnom", None)
        
        # Additional pharmacist fields
        numero_autorisation = validated_data.pop("numero_autorisation", "")
        matricule_fiscal = validated_data.pop("matricule_fiscal", "")
        document_autorisation = validated_data.pop("document_autorisation", None)
        document_patente = validated_data.pop("document_patente", None)

        # Tracing Légal
        cgu_v = validated_data.pop("cgu_version", None)
        contrat_v = validated_data.pop("contrat_version", None)
        conf_v = validated_data.pop("confidentialite_version", None)

        validated_data["username"] = validated_data["email"]
        validated_data["password"] = make_password(validated_data["password"])
        validated_data["is_verified"] = False

        user = CustomUser.objects.create(**validated_data)

        # Enregistrement des acceptations légales
        from .models import LegalAcceptance
        request = self.context.get("request")
        ip_address = None
        if request:
            x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(",")[0].strip()
            else:
                ip_address = request.META.get("REMOTE_ADDR")

        if cgu_v:
            LegalAcceptance.objects.create(user=user, document_type="CGU", version=cgu_v, ip_address=ip_address)
        if contrat_v:
            LegalAcceptance.objects.create(user=user, document_type="CONTRAT", version=contrat_v, ip_address=ip_address)
        if conf_v:
            LegalAcceptance.objects.create(user=user, document_type="CONFIDENTIALITE", version=conf_v, ip_address=ip_address)

        if user.role == CustomUser.Role.MEDECIN:
            DoctorProfile.objects.create(
                user=user,
                specialite=specialite,
                numero_ordre=numero_ordre,
                tarif_consultation=tarif_consultation,
                cin_numero=cin_numero,
                gouvernorat=gouvernorat,
                document_cin=document_cin,
                document_cnom=document_cnom,
                photo=image,
            )
        elif user.role == CustomUser.Role.PHARMACIEN:
            PharmacistProfile.objects.create(
                user=user,
                nom_pharmacie=nom_pharmacie,
                adresse=adresse,
                photo_pharmacie=image,
                cin_numero=cin_numero,
                numero_autorisation=numero_autorisation,
                gouvernorat=gouvernorat,
                matricule_fiscal=matricule_fiscal,
                document_cin=document_cin,
                document_autorisation=document_autorisation,
                document_patente=document_patente,
            )
            
        # Clear out the OTP verification state to prevent reuse
        from django.core.cache import cache
        cache.delete(f"otp_verified_{user.email}")

        return user


class UserSerializer(serializers.ModelSerializer):
    """
    Représentation publique d'un utilisateur.
    Retourné après login, register et sur /auth/me/.
    """

    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ["id", "email", "nom", "prenom", "role", "is_verified", "photo_url"]
        read_only_fields = fields  # Lecture seule : cet objet ne sert qu'à la réponse

    def get_photo_url(self, obj):
        request = self.context.get("request")
        if (
            obj.role == "MEDECIN"
            and hasattr(obj, "doctorprofile")
            and obj.doctorprofile.photo
        ):
            url = obj.doctorprofile.photo.url
            return request.build_absolute_uri(url) if request else url
        elif (
            obj.role == "PHARMACIEN"
            and hasattr(obj, "pharmacistprofile")
            and obj.pharmacistprofile.photo_pharmacie
        ):
            url = obj.pharmacistprofile.photo_pharmacie.url
            return request.build_absolute_uri(url) if request else url
        return None


class DoctorListSerializer(serializers.ModelSerializer):
    """
    Représentation publique d'un profil médecin, avec les infos de l'utilisateur
    associé aplaties au même niveau.
    """

    nom = serializers.CharField(source="user.nom", read_only=True)
    prenom = serializers.CharField(source="user.prenom", read_only=True)
    id = serializers.IntegerField(source="user.id", read_only=True)
    photo = serializers.SerializerMethodField()

    def get_photo(self, obj):
        if obj.photo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.photo.url)
        return None

    class Meta:
        model = DoctorProfile
        fields = [
            "id",
            "nom",
            "prenom",
            "specialite",
            "status",
            "tarif_consultation",
            "photo",
        ]
        read_only_fields = fields


class DoctorProfileSerializer(serializers.ModelSerializer):
    """Serializer pour la lecture du profil médecin."""

    nom = serializers.CharField(source="user.nom")
    prenom = serializers.CharField(source="user.prenom")
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = DoctorProfile
        fields = [
            "id",
            "nom",
            "prenom",
            "email",
            "specialite",
            "numero_ordre",
            "tarif_consultation",
            "status",
            "photo",
        ]
        read_only_fields = ["id", "email", "status"]


class DoctorProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la modification du profil médecin."""

    nom = serializers.CharField(max_length=100, required=False)
    prenom = serializers.CharField(max_length=100, required=False)
    specialite = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero_ordre = serializers.CharField(
        max_length=50, required=False, allow_blank=True
    )
    tarif_consultation = serializers.DecimalField(
        max_digits=8, decimal_places=2, required=False, min_value=0
    )
    photo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = DoctorProfile
        fields = [
            "nom",
            "prenom",
            "specialite",
            "numero_ordre",
            "tarif_consultation",
            "photo",
        ]

    def update(self, instance, validated_data):
        nom = validated_data.pop("nom", None)
        prenom = validated_data.pop("prenom", None)
        photo = validated_data.pop("photo", None)

        if nom is not None or prenom is not None:
            user = instance.user
            if nom is not None:
                user.nom = nom
            if prenom is not None:
                user.prenom = prenom
            user.save()

        if photo is not None:
            instance.photo = photo

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance
