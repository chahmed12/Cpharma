from rest_framework.decorators import api_view, permission_classes
from rest_framework            import status, permissions
from rest_framework.response   import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth        import authenticate
from channels.layers           import get_channel_layer
from asgiref.sync              import async_to_sync
from .models                    import CustomUser, DoctorProfile
from .serializers               import RegisterSerializer, UserSerializer, DoctorListSerializer

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'message': 'Compte créé avec succès'}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    email    = request.data.get('email')
    password = request.data.get('password')
    user     = authenticate(request, username=email, password=password)

    if not user:
        return Response({'detail': 'Email ou mot de passe incorrect'}, status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
        'user':    UserSerializer(user).data,
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def doctors_online(request):
    profiles = DoctorProfile.objects.filter(status='ONLINE').select_related('user')
    return Response(DoctorListSerializer(profiles, many=True).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def doctors_list(request):
    profiles = DoctorProfile.objects.select_related('user').all()
    return Response(DoctorListSerializer(profiles, many=True).data)

@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_doctor_status(request):
    """Médecin récupère ou met à jour son statut et notifie les pharmaciens."""
    # Bug C1 fix : seul un médecin peut accéder à cet endpoint
    if request.user.role != 'MEDECIN':
        return Response({'detail': 'Interdit.'}, status=403)

    profile = request.user.doctorprofile

    if request.method == 'GET':
        return Response({'status': profile.status})

    new_status = request.data.get('status', 'ONLINE')

    if new_status not in ('ONLINE', 'OFFLINE', 'BUSY'):
        return Response({'error': 'Statut invalide'}, status=400)

    profile.status = new_status
    profile.save()

    # NOTIFICATION WEBSOCKET aux pharmaciens
    async_to_sync(get_channel_layer().group_send)(
        'pharmacists_broadcast',
        {
            'type':      'doctor_status_changed',
            'doctor_id': request.user.id,
            'status':    new_status,
        }
    )
    return Response({'status': new_status})

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_public_key(request):
    """Médecin enregistre sa clé publique pour la PKI."""
    profile = request.user.doctorprofile
    profile.public_key = request.data.get('public_key')
    profile.save()
    return Response({'ok': True})
