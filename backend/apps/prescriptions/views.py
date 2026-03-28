import json
import base64
import hashlib

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.response import Response
from apps.core.permissions import IsVerified
from .models import Prescription
from .serializers import PrescriptionSerializer
from apps.core.audit import log_action

import logging

logger = logging.getLogger(__name__)


def verify_rsa_signature(public_key_b64: str, signature_b64: str, data: dict) -> bool:
    """
    Vérifie la signature RSA-PSS avec la clé publique du médecin.
    L'algorithme correspond au Web Crypto API : RSA-PSS / SHA-256 / saltLength=32.

    FIX : On distingue maintenant InvalidSignature (fausse signature) des erreurs
    techniques (clé corrompue, base64 invalide) au lieu de les masquer toutes.
    """
    try:
        # Gérer les deux formats : Base64 brut ou PEM
        if public_key_b64.startswith("-----BEGIN"):
            lines = public_key_b64.strip().split("\n")
            pub_bytes = base64.b64decode("".join(lines[1:-1]))
        else:
            pub_bytes = base64.b64decode(public_key_b64)
        public_key: RSAPublicKey = serialization.load_der_public_key(pub_bytes)

        sig_bytes = base64.b64decode(signature_b64)
        msg_bytes = json.dumps(
            data, separators=(",", ":"), sort_keys=True, ensure_ascii=False
        ).encode("utf-8")

        public_key.verify(
            sig_bytes,
            msg_bytes,
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=32),
            hashes.SHA256(),
        )
        return True

    except InvalidSignature:
        # Signature mathématiquement incorrecte : le document a peut-être été altéré
        logger.warning(
            "Signature RSA-PSS invalide — le contenu de l'ordonnance ne correspond pas à la signature."
        )
        return False

    except Exception as e:
        # Erreur technique (base64 corrompu, clé invalide, etc.)
        # On remonte l'exception plutôt que de la masquer silencieusement
        logger.error(f"Erreur technique lors de la vérification PKI : {e}")
        raise


class PrescriptionViewSet(viewsets.ModelViewSet):
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated, IsVerified]
    parser_classes = [MultiPartParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        if user.role == "PHARMACIEN":
            return Prescription.objects.filter(
                consultation__pharmacien=user
            ).select_related(
                "consultation", "consultation__patient", "consultation__medecin"
            )
        return Prescription.objects.filter(medecin=user).select_related(
            "consultation", "consultation__patient"
        )

    def create(self, request):
        """
        Reçoit l'ordonnance, vérifie la signature PKI et enregistre.
        Le sha256_hash est recalculé côté backend à partir du PDF uploadé.
        """
        raw_ordonnance = request.data.get("ordonnance_data")
        if not raw_ordonnance:
            return Response(
                {"detail": "ordonnance_data requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            ordonnance_data = json.loads(raw_ordonnance)
        except (json.JSONDecodeError, TypeError):
            return Response(
                {"detail": "JSON invalide."}, status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(ordonnance_data, dict):
            return Response(
                {"detail": "ordonnance_data doit être un objet JSON."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        signature = request.data.get("signature")
        client_hash = request.data.get("sha256_hash")
        pdf_file = request.FILES.get("pdf")

        # ── 0. Validation du fichier PDF (SEC-03) ─────────────────────────────
        if pdf_file:
            import magic

            MAX_PDF_SIZE = 10 * 1024 * 1024  # 10 Mo
            if pdf_file.size > MAX_PDF_SIZE:
                return Response(
                    {"detail": "Fichier trop grand (max 10 Mo)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            mime = magic.from_buffer(pdf_file.read(2048), mime=True)
            if mime != "application/pdf":
                return Response(
                    {"detail": "Fichier PDF invalide."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            pdf_file.seek(0)

        # ── 1. Vérification du hash PDF ───────────────────────────────────────
        if pdf_file:
            pdf_bytes = pdf_file.read()
            computed_hash = hashlib.sha256(pdf_bytes).hexdigest()
            pdf_file.seek(0)

            if computed_hash != client_hash:
                return Response(
                    {
                        "detail": "Hash PDF incohérent. Le document a peut-être été altéré."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        sha256_hash = client_hash

        # ── 2. Vérification de la clé publique ───────────────────────────────
        medecin = request.user

        if not hasattr(medecin, "doctorprofile") or not medecin.doctorprofile:
            return Response(
                {"detail": "Profil médecin introuvable."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        public_key_b64 = medecin.doctorprofile.public_key

        if not public_key_b64:
            return Response(
                {
                    "detail": "Clé publique PKI absente. Veuillez vous reconnecter pour générer vos clés."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 3. Vérification PKI (non-répudiation) ────────────────────────────
        try:
            is_valid = verify_rsa_signature(public_key_b64, signature, ordonnance_data)
        except Exception as e:
            logger.error(
                "Erreur technique lors de la vérification de la signature : %s", e
            )
            return Response(
                {
                    "detail": "Erreur technique lors de la vérification de la signature. Réessayez."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not is_valid:
            return Response(
                {
                    "detail": "Signature RSA-PSS invalide. Ordonnance rejetée pour non-conformité."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 4. Validation de la consultation ─────────────────────────────────
        consultation_id = ordonnance_data.get("consultation_id")
        if not consultation_id:
            return Response(
                {"detail": "consultation_id manquant dans ordonnance_data."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.consultations.models import Consultation

        try:
            consultation = Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            return Response(
                {"detail": "Consultation non trouvée."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if consultation.medecin_id != medecin.id:
            return Response(
                {
                    "detail": "Vous n'êtes pas autorisé à prescrire pour cette consultation."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if consultation.status not in [
            Consultation.Status.ACTIVE,
            Consultation.Status.COMPLETED,
        ]:
            return Response(
                {
                    "detail": "La consultation n'est pas dans un état valide pour créer une ordonnance."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Prescription.objects.filter(consultation=consultation).exists():
            return Response(
                {"detail": "Une ordonnance existe déjà pour cette consultation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── 5. Création de la prescription ───────────────────────────────────
        prescription = Prescription.objects.create(
            consultation_id=consultation_id,
            medecin=medecin,
            ordonnance_data=ordonnance_data,
            signature=signature,
            sha256_hash=sha256_hash,
            is_valid=is_valid,
            pdf=pdf_file,
        )

        log_action(
            medecin,
            "PRESCRIPTION_CREATED",
            f"Ordonnance #{prescription.id} pour consultation #{consultation_id}",
            request=request,
        )

        # ── 6. Notification WebSocket au pharmacien ───────────────────────────
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"pharmacien_{prescription.consultation.pharmacien_id}",
            {
                "type": "prescription_ready",
                "hash": sha256_hash,
            },
        )

        return Response(
            PrescriptionSerializer(prescription).data, status=status.HTTP_201_CREATED
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="verify/(?P<hash>[^/.]+)",
        permission_classes=[permissions.IsAuthenticated],
    )
    def verify(self, request, hash=None):
        """Endpoint pharmacien : retourne ordonnance + clé publique médecin."""
        try:
            p = Prescription.objects.select_related("medecin__doctorprofile").get(
                sha256_hash=hash
            )
        except Prescription.DoesNotExist:
            return Response(
                {"detail": "Ordonnance introuvable"}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {
                "ordonnance_data": p.ordonnance_data,
                "signature": p.signature,
                "sha256_hash": p.sha256_hash,
                "is_valid": p.is_valid,
                "medecin_public_key": p.medecin.doctorprofile.public_key,
            }
        )
