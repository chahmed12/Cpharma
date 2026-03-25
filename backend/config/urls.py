from django.contrib import admin
from django.urls import path, include
from django.contrib.auth.decorators import login_required
from django.views.static import serve
from django.conf import settings

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.patients.urls")),
    path("api/", include("apps.consultations.urls")),
    path("api/", include("apps.prescriptions.urls")),
    path("api/", include("apps.payments.urls")),
    path(
        "media/prescriptions/<path:path>",
        login_required(serve),
        {"document_root": settings.MEDIA_ROOT / "prescriptions"},
    ),
]
