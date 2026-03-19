from django.db.models          import Sum
from django.utils              import timezone
from rest_framework            import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response   import Response
from .models                   import Payment
from .serializers              import PaymentSerializer


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

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
        """Récupère le paiement d'une consultation spécifique."""
        try:
            p = Payment.objects.get(
                consultation_id=consultation_id
            )
        except Payment.DoesNotExist:
            return Response(
                {'detail': 'Paiement non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(PaymentSerializer(p).data)

    @action(detail=True, methods=['patch'], url_path='confirm')
    def confirm(self, request, pk=None):
        """Pharmacien confirme la réception du paiement en espèces."""
        if request.user.role != 'PHARMACIEN':
            return Response(
                {'detail': 'Seul le pharmacien peut confirmer un paiement.'},
                status=status.HTTP_403_FORBIDDEN
            )
        payment         = self.get_object()
        payment.status  = Payment.Status.PAID
        payment.paid_at = timezone.now()
        payment.save()
        
        # Bug ORD-4 fix : Marquer l'ordonnance comme définitivement délivrée
        if hasattr(payment.consultation, 'prescription'):
            payment.consultation.prescription.is_dispensed = True
            payment.consultation.prescription.save()
            
        return Response(PaymentSerializer(payment).data)

    @action(detail=False, methods=['get'], url_path='revenus')
    def revenus(self, request):
        """Médecin consulte ses revenus agrégés + liste des paiements."""
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