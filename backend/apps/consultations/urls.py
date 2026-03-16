# apps/consultations/urls.py

from rest_framework.routers import DefaultRouter
from .views import ConsultationViewSet

router = DefaultRouter()
router.register(r'consultations', ConsultationViewSet, basename='consultation')

urlpatterns = router.urls

# Endpoints générés automatiquement :
# GET  /api/consultations/          → liste
# POST /api/consultations/          → créer (pharmacien)
# GET  /api/consultations/{id}/     → détail
# GET  /api/consultations/queue/    → file d'attente médecin
# PATCH /api/consultations/{id}/status/ → changer le statut