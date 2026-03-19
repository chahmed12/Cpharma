import json, base64
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from cryptography.hazmat.primitives              import hashes, serialization
from cryptography.hazmat.primitives.asymmetric    import padding
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
from rest_framework                               import viewsets, permissions, status
from rest_framework.decorators                    import action
from rest_framework.response                      import Response
from .models                                      import Prescription
from .serializers                                 import PrescriptionSerializer
from apps.core.audit                              import log_action


import logging
logger = logging.getLogger(__name__)

def verify_rsa_signature(public_key_b64: str, signature_b64: str, data: dict) -> bool:
    """Vérifie la signature RSA-PSS avec la clé publique du médecin.
    L'algorithme correspond au Web Crypto API: RSA-PSS avec SHA-256 et saltLength=32.
    """
    try:
        pub_bytes  = base64.b64decode(public_key_b64)
        public_key: RSAPublicKey = serialization.load_der_public_key(pub_bytes)

        sig_bytes  = base64.b64decode(signature_b64)
        # Réplication exacte du JSON.stringify(canonicalData) de JavaScript
        msg_bytes  = json.dumps(data, separators=(',', ':'), sort_keys=True, ensure_ascii=False).encode('utf-8')

        public_key.verify(
            sig_bytes, msg_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=32              # Correspond à saltLength: 32 côté Web Crypto
            ),
            hashes.SHA256()
        )
        return True
    except Exception as e:
        logger.warning(f"Signature mismatch or decoding error: {e}")
        return False


class PrescriptionViewSet(viewsets.ModelViewSet):
    serializer_class   = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PHARMACIEN':
            return Prescription.objects.filter(consultation__pharmacien=user)
        return Prescription.objects.filter(medecin=user)

    def create(self, request):
        """Reçoit l'ordonnance, vérifie la signature PKI et enregistre."""
        ordonnance_data = json.loads(request.data.get('ordonnance_data'))
        signature       = request.data.get('signature')
        sha256_hash     = request.data.get('sha256_hash')
        pdf_file        = request.FILES.get('pdf')

        # Récupérer la clé publique du médecin depuis son profil
        medecin        = request.user
        public_key_b64 = medecin.doctorprofile.public_key

        # Bug ORD-2 fix : Rejeter strictement si la clé publique n'est pas configurée
        if not public_key_b64:
            return Response({'detail': 'Clé publique PKI absente. Veuillez vous reconnecter pour générer vos clés.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Vérification PKI côté backend (non-répudiation)
        is_valid = verify_rsa_signature(public_key_b64, signature, ordonnance_data)
        
        # Bug ORD-1 fix : Ne JAMAIS enregistrer une ordonnance invalide
        if not is_valid:
            return Response({'detail': 'Signature RSA-PSS invalide. Ordonnance rejetée pour non-conformité.'},
                            status=status.HTTP_400_BAD_REQUEST)
        
        consultation_id = ordonnance_data.get('consultation_id')

        # Bug SOL-BUG-2 fix : Verifier que le médecin est propriétaire et consultation ACTIVE
        from apps.consultations.models import Consultation
        try:
            consultation = Consultation.objects.get(id=consultation_id)
        except Consultation.DoesNotExist:
            return Response({'detail': 'Consultation non trouvée.'}, status=status.HTTP_404_NOT_FOUND)

        if consultation.medecin_id != medecin.id:
            return Response({'detail': "Vous n'êtes pas autorisé à prescrire pour cette consultation."}, status=status.HTTP_403_FORBIDDEN)

        if consultation.status != Consultation.Status.ACTIVE:
            return Response({'detail': "La consultation n'est pas active."}, status=status.HTTP_400_BAD_REQUEST)

        prescription = Prescription.objects.create(
            consultation_id=consultation_id,
            medecin=medecin,
            ordonnance_data=ordonnance_data,
            signature=signature,
            sha256_hash=sha256_hash,
            is_valid=is_valid,
            pdf=pdf_file,
        )
        
        log_action(medecin, 'PRESCRIPTION_CREATED', f"Ordonnance #{prescription.id} pour consultation #{consultation_id}")

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'pharmacien_{prescription.consultation.pharmacien_id}',
            {
                'type': 'prescription_ready',
                'hash': sha256_hash,
            }
        )

        return Response(
            PrescriptionSerializer(prescription).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'],
            url_path='verify/(?P<hash>[^/.]+)',
            permission_classes=[permissions.IsAuthenticated])
    def verify(self, request, hash=None):
        """Endpoint pharmacien : retourne ordonnance + clé publique médecin."""
        try:
            p = Prescription.objects.select_related(
                'medecin__doctorprofile'
            ).get(sha256_hash=hash)
        except Prescription.DoesNotExist:
            return Response(
                {'detail': 'Ordonnance introuvable'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'ordonnance_data':   p.ordonnance_data,
            'signature':         p.signature,
            'sha256_hash':       p.sha256_hash,
            'is_valid':          p.is_valid,
            'medecin_public_key': p.medecin.doctorprofile.public_key,
        })