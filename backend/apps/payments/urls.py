# ── apps/payments/urls.py ────────────────────────────
from rest_framework.routers import DefaultRouter
from .views                 import PaymentViewSet

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = router.urls

# Endpoints générés automatiquement :
# GET  /api/payments/                          → liste
# GET  /api/payments/{id}/                     → détail
# GET  /api/payments/consultation/{id}/        → par consultation
# PATCH /api/payments/{id}/confirm/            → confirmer paiement
# GET  /api/payments/revenus/                  → revenus médecin