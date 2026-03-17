from django.contrib import admin
from django.urls    import path, include

urlpatterns = [
    path('admin/',   admin.site.urls),
    path('api/',    include('apps.accounts.urls')),
    path('api/',    include('apps.patients.urls')),
    path('api/',    include('apps.consultations.urls')),
    path('api/',    include('apps.prescriptions.urls')),
    path('api/',    include('apps.payments.urls')),
]


