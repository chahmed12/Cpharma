import json, base64
from cryptography.hazmat.primitives              import hashes, serialization
from cryptography.hazmat.primitives.asymmetric    import padding
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
from rest_framework                               import viewsets, permissions, status
from rest_framework.decorators                    import action
from rest_framework.response                      import Response
from .models                                      import Prescription
from .serializers                                 import PrescriptionSerializer


def verify_rsa_signature(public_key_b64: str, signature_b64: str, data: dict) -> bool:
    """Vérifie la signature RSA-PSS avec la clé publique du médecin."""
    try:
        pub_bytes  = base64.b64decode(public_key_b64)
        public_key: RSAPublicKey = serialization.load_der_public_key(pub_bytes)

        sig_bytes  = base64.b64decode(signature_b64)
        msg_bytes  = json.dumps(data, separators=(',', ':')).encode()

        public_key.verify(
            sig_bytes, msg_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=32
            ),
            hashes.SHA256()
        )
        return True
    except Exception:
        return False


class PrescriptionViewSet(viewsets.ModelViewSet):
    serializer_class   = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Prescription.objects.filter(medecin=self.request.user)

    def create(self, request):
        """Reçoit l'ordonnance, vérifie la signature PKI et enregistre."""
        ordonnance_data = json.loads(request.data.get('ordonnance_data'))
        signature       = request.data.get('signature')
        sha256_hash     = request.data.get('sha256_hash')
        pdf_file        = request.FILES.get('pdf')

        # Récupérer la clé publique du médecin depuis son profil
        medecin        = request.user
        public_key_b64 = medecin.doctorprofile.public_key

        # Vérification PKI côté backend (non-répudiation)
        is_valid = verify_rsa_signature(public_key_b64, signature, ordonnance_data)

        prescription = Prescription.objects.create(
            medecin=medecin,
            ordonnance_data=ordonnance_data,
            signature=signature,
            sha256_hash=sha256_hash,
            is_valid=is_valid,
            pdf=pdf_file,
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