from django.db.models          import Sum
from django.utils              import timezone
from rest_framework            import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response   import Response
from apps.core.permissions     import IsVerified
from .models                   import Payment
from .serializers              import PaymentSerializer
from apps.core.audit           import log_action


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsVerified]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'MEDECIN':
            return Payment.objects.filter(medecin=user)
        # Pharmacien : paiements des consultations qu'il a initiées
        return Payment.objects.filter(
            consultation__pharmacien=user
        )

    @action(detail=False, methods=['get'],
            url_path=r'consultation/(?P<consultation_id>\d+)')
    def by_consultation(self, request, consultation_id=None):
        """Récupère le paiement d'une consultation spécifique (accès sécurisé)."""
        try:
            payment = Payment.objects.select_related('consultation').get(
                consultation_id=consultation_id
            )
        except Payment.DoesNotExist:
            return Response(
                {'detail': 'Paiement non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Vérification stricte des droits d'accès (IDOR fix)
        cons = payment.consultation
        user_id = request.user.id
        
        # Seuls les acteurs de CETTE consultation peuvent voir le paiement
        if user_id != cons.medecin_id and user_id != cons.pharmacien_id:
            return Response(
                {'detail': 'Accès non autorisé à ce paiement.'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        return Response(PaymentSerializer(payment).data)

    @action(detail=True, methods=['patch'], url_path='confirm')
    def confirm(self, request, pk=None):
        """Pharmacien confirme la réception du paiement en espèces."""
        if request.user.role != 'PHARMACIEN':
            return Response(
                {'detail': 'Seul le pharmacien peut confirmer un paiement.'},
                status=status.HTTP_403_FORBIDDEN
            )
        payment         = self.get_object()

        if payment.consultation.pharmacien_id != request.user.id:
            return Response(
                {'detail': 'Vous ne pouvez pas confirmer une consultation qui ne vous est pas assignée.'},
                status=status.HTTP_403_FORBIDDEN
            )

        payment.status  = Payment.Status.PAID
        payment.paid_at = timezone.now()
        payment.save()
        
        # Bug ORD-4 fix : Marquer l'ordonnance comme définitivement délivrée
        if hasattr(payment.consultation, 'prescription'):
            payment.consultation.prescription.is_dispensed = True
            payment.consultation.prescription.save()
            
        log_action(request.user, 'PAYMENT_CONFIRMED', f"Paiement #{payment.id} confirmé pour consultation #{payment.consultation_id}")
            
        return Response(PaymentSerializer(payment).data)

    @action(detail=False, methods=['get'], url_path='revenus')
    def revenus(self, request):
        """Médecin consulte ses revenus agrégés + liste des paiements."""
        if request.user.role != 'MEDECIN':
            return Response(
                {'detail': 'Seuls les médecins peuvent consulter les revenus.'},
                status=status.HTTP_403_FORBIDDEN
            )
        qs = Payment.objects.filter(
            medecin=request.user,
            status=Payment.Status.PAID
        )
        agg = qs.aggregate(
            total_brut=Sum('montant_total'),
            total_net=Sum('honoraires_medecin'),
        )
        return Response({
            'total_brut':       str(agg['total_brut'] or 0),
            'total_net':        str(agg['total_net']  or 0),
            'nb_consultations': qs.count(),
            'paiements':        PaymentSerializer(qs, many=True).data,
        })