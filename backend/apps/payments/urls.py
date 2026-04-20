# ── apps/payments/urls.py ────────────────────────────
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, SubscriptionView

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = router.urls + [
    # Abonnements (prototype — sans gateway de paiement)
    path("subscriptions/",              SubscriptionView.as_view(), name="subscription-status"),
    path("subscriptions/simulate-pay/", SubscriptionView.as_view(), name="subscription-simulate-pay"),
]

# Endpoints générés automatiquement :
# GET   /api/payments/                          → liste
# GET   /api/payments/{id}/                     → détail
# GET   /api/payments/consultation/{id}/        → par consultation
# PATCH /api/payments/{id}/confirm/             → confirmer paiement
# GET   /api/payments/revenus/                  → revenus médecin
# GET   /api/payments/export-csv/               → export CSV
#
# Abonnements :
# GET   /api/subscriptions/                     → statut abonnement
# POST  /api/subscriptions/simulate-pay/        → +30 jours (simulation paiement)