# apps/prescriptions/urls.py

from rest_framework.routers import DefaultRouter
from .views import PrescriptionViewSet

router = DefaultRouter()
router.register(r'prescriptions', PrescriptionViewSet, basename='prescription')

urlpatterns = router.urls

# Endpoints générés :
# POST /api/prescriptions/                        → médecin soumet l'ordonnance signée
# GET  /api/prescriptions/                        → liste des prescriptions du médecin
# GET  /api/prescriptions/{id}/                   → détail
# GET  /api/prescriptions/verify/{hash}/          → pharmacien vérifie une ordonnance