import csv
import io
from datetime import datetime, timedelta
from django.db.models import Sum
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.core.permissions import IsVerified, IsSubscribed
from .models import Payment, Subscription
from .serializers import PaymentSerializer
from apps.core.audit import log_action


# ─────────────────────────────────────────────────────────────────────────────
#  ABONNEMENTS — Statut & Simulation de paiement
# ─────────────────────────────────────────────────────────────────────────────


class SubscriptionView(APIView):
    """
    Endpoints de gestion de l'abonnement (version prototype — sans gateway).

    GET  /api/subscriptions/        → statut de l'abonnement de l'utilisateur connecté
    POST /api/subscriptions/simulate-pay/ → ajoute 30 jours à end_date (simulation)
    """
    permission_classes = [permissions.IsAuthenticated, IsVerified]

    def get(self, request):
        """Retourne le statut de l'abonnement de l'utilisateur connecté."""
        try:
            sub = request.user.subscription
            return Response({
                "end_date": sub.end_date,
                "is_active": sub.is_active(),
                "days_remaining": (sub.end_date - timezone.now().date()).days,
            })
        except Subscription.DoesNotExist:
            return Response(
                {"detail": "Aucun abonnement trouvé pour cet utilisateur."},
                status=status.HTTP_404_NOT_FOUND,
            )

    def post(self, request):
        """
        Simule un paiement d'abonnement en ajoutant 30 jours à end_date.
        Crée l'abonnement s'il n'existe pas encore.
        Réservé aux médecins et pharmaciens uniquement.
        """
        if request.user.role not in ("MEDECIN", "PHARMACIEN"):
            return Response(
                {"detail": "Seuls les professionnels de santé peuvent souscrire à un abonnement."},
                status=status.HTTP_403_FORBIDDEN,
            )

        sub, created = Subscription.objects.get_or_create(
            user=request.user,
            defaults={"end_date": timezone.now().date()},
        )
        sub.extend(days=30)

        log_action(
            request.user,
            "OTHER",
            f"Abonnement simulé — nouvelle date d'expiration : {sub.end_date}",
            request=request,
        )

        return Response({
            "message": "Abonnement renouvelé avec succès (+30 jours).",
            "end_date": sub.end_date,
            "is_active": sub.is_active(),
            "days_remaining": (sub.end_date - timezone.now().date()).days,
        }, status=status.HTTP_200_OK)



class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsVerified]

    def get_queryset(self):
        user = self.request.user
        if user.role == "MEDECIN":
            return Payment.objects.filter(medecin=user).select_related(
                "medecin", "consultation__patient"
            )
        return Payment.objects.filter(consultation__pharmacien=user).select_related(
            "medecin", "consultation__patient"
        )

    @action(
        detail=False, methods=["get"], url_path=r"consultation/(?P<consultation_id>\d+)"
    )
    def by_consultation(self, request, consultation_id=None):
        """Récupère le paiement d'une consultation spécifique (accès sécurisé)."""
        try:
            payment = Payment.objects.select_related("consultation").get(
                consultation_id=consultation_id
            )
        except Payment.DoesNotExist:
            return Response(
                {"detail": "Paiement non trouvé"}, status=status.HTTP_404_NOT_FOUND
            )

        # Vérification stricte des droits d'accès (IDOR fix)
        cons = payment.consultation
        user_id = request.user.id

        # Seuls les acteurs de CETTE consultation peuvent voir le paiement
        if user_id != cons.medecin_id and user_id != cons.pharmacien_id:
            return Response(
                {"detail": "Accès non autorisé à ce paiement."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(PaymentSerializer(payment).data)

    @action(detail=True, methods=["patch"], url_path="confirm")
    def confirm(self, request, pk=None):
        """Pharmacien confirme la réception du paiement en espèces."""
        from django.db import transaction

        if request.user.role != "PHARMACIEN":
            return Response(
                {"detail": "Seul le pharmacien peut confirmer un paiement."},
                status=status.HTTP_403_FORBIDDEN,
            )
        payment = self.get_object()

        if payment.status == Payment.Status.PAID:
            return Response(
                {"detail": "Ce paiement a déjà été confirmé."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payment.consultation.pharmacien_id != request.user.id:
            return Response(
                {
                    "detail": "Vous ne pouvez pas confirmer une consultation qui ne vous est pas assignée."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        with transaction.atomic():
            payment.status = Payment.Status.PAID
            payment.paid_at = timezone.now()
            payment.save()

            if hasattr(payment.consultation, "prescription"):
                payment.consultation.prescription.is_dispensed = True
                payment.consultation.prescription.save()

        log_action(
            request.user,
            "PAYMENT_CONFIRMED",
            f"Paiement #{payment.id} confirmé pour consultation #{payment.consultation_id}",
            request=request,
        )

        return Response(PaymentSerializer(payment).data)

    @action(detail=False, methods=["get"], url_path="revenus")
    def revenus(self, request):
        """Médecin consulte ses revenus agrégés + liste des paiements."""
        if request.user.role != "MEDECIN":
            return Response(
                {"detail": "Seuls les médecins peuvent consulter les revenus."},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = Payment.objects.filter(
            medecin=request.user, status=Payment.Status.PAID
        ).select_related("medecin", "consultation__patient")
        agg = qs.aggregate(
            total_brut=Sum("montant_total"),
            total_net=Sum("honoraires_medecin"),
        )
        return Response(
            {
                "total_brut": str(agg["total_brut"] or 0),
                "total_net": str(agg["total_net"] or 0),
                "nb_consultations": qs.count(),
                "paiements": PaymentSerializer(qs, many=True).data,
            }
        )

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        """Exporte les paiements en CSV pour la comptabilité."""
        user = request.user
        if user.role == "MEDECIN":
            qs = Payment.objects.filter(medecin=user, status=Payment.Status.PAID)
        elif user.role == "PHARMACIEN":
            qs = Payment.objects.filter(
                consultation__pharmacien=user, status=Payment.Status.PAID
            )
        else:
            return Response(
                {"detail": "Non autorisé"}, status=status.HTTP_403_FORBIDDEN
            )

        qs = qs.select_related("medecin", "consultation__patient").order_by(
            "-created_at"
        )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "ID",
                "Date",
                "Médecin",
                "Patient",
                "Montant Total",
                "Commission",
                "Honoraires Médecin",
                "Statut",
            ]
        )
        for p in qs:
            patient = getattr(p.consultation, "patient", None)
            writer.writerow(
                [
                    p.id,
                    p.created_at.strftime("%d/%m/%Y %H:%M"),
                    f"{p.medecin.prenom} {p.medecin.nom}",
                    f"{patient.prenom} {patient.nom}" if patient else "",
                    str(p.montant_total),
                    str(p.commission),
                    str(p.honoraires_medecin),
                    p.status,
                ]
            )

        response = HttpResponse(output.getvalue(), content_type="text/csv")
        filename = f"cpharma_paiements_{datetime.now().strftime('%Y%m%d')}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=["get"], url_path="invoice")
    def invoice(self, request, pk=None):
        """Génère un PDF facture pour un paiement."""
        from django.shortcuts import render

        payment = self.get_object()
        serializer = PaymentSerializer(payment)

        consultation_date = serializer.data.get("consultation_date", payment.created_at)
        if isinstance(consultation_date, str):
            dt = datetime.fromisoformat(consultation_date.replace("Z", "+00:00"))
            consultation_date = dt.strftime("%d/%m/%Y à %H:%M")
        else:
            consultation_date = payment.created_at.strftime("%d/%m/%Y à %H:%M")

        context = {
            "payment": payment,
            "consultation_date": consultation_date,
            "patient_nom": serializer.data.get("patient_nom", ""),
            "medecin_nom": serializer.data.get("medecin_nom", ""),
            "medecin_email": serializer.data.get("medecin_email", ""),
            "medecin_specialite": serializer.data.get("medecin_specialite", "Médecin"),
            "montant_total": serializer.data.get("montant_total", "0.00"),
            "commission": serializer.data.get("commission", "0.00"),
            "honoraires_medecin": serializer.data.get("honoraires_medecin", "0.00"),
            "generation_date": datetime.now().strftime("%d/%m/%Y à %H:%M"),
        }
        return render(request, "payments/invoice.html", context)
