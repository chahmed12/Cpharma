from django.urls                        import path
from rest_framework_simplejwt.views     import TokenRefreshView
from .                                  import views

urlpatterns = [
    path('auth/register/',       views.register,              name='register'),
    path('auth/login/',          views.login,                 name='login'),
    path('auth/token/refresh/',  TokenRefreshView.as_view(), name='token_refresh'),
    path('doctors/online/',      views.doctors_online,        name='doctors_online'),
    path('doctors/status/',      views.update_doctor_status,  name='doctor_status'),
    path('doctors/public-key/',  views.update_public_key,     name='doctor_pubkey'),
    path('doctors/', views.doctors_list, name='doctors_list'),
]