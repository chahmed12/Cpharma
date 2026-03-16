from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response   import Response
from rest_framework                        import status, permissions
from rest_framework.decorators             import api_view, permission_classes
from rest_framework.response               import Response
from rest_framework_simplejwt.tokens        import RefreshToken
from django.contrib.auth                   import authenticate
from .models                               import CustomUser, DoctorProfile
from .serializers                          import RegisterSerializer, UserSerializer, DoctorListSerializer

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_public_key(request):
    profile = request.user.doctorprofile
    profile.public_key = request.data.get('public_key')
    profile.save()
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(
            {'message': 'Compte créé avec succès'},
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    email    = request.data.get('email')
    password = request.data.get('password')
    user     = authenticate(request, username=email, password=password)

    if not user:
        return Response(
            {'detail': 'Email ou mot de passe incorrect'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    refresh = RefreshToken.for_user(user)
    return Response({
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
        'user':    UserSerializer(user).data,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def doctors_online(request):
    """Liste des médecins disponibles (ONLINE) pour le pharmacien."""
    profiles = DoctorProfile.objects.filter(
        status='ONLINE'
    ).select_related('user')
    return Response(DoctorListSerializer(profiles, many=True).data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_doctor_status(request):
    """Médecin met à jour son statut ONLINE/BUSY/OFFLINE."""
    profile        = request.user.doctorprofile
    profile.status = request.data.get('status', 'ONLINE')
    profile.save()
    return Response({'status': profile.status})


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_public_key(request):
    """Médecin envoie sa clé publique RSA (phase PKI)."""
    profile            = request.user.doctorprofile
    profile.public_key = request.data.get('public_key')
    profile.save()
    return Response({'ok': True})