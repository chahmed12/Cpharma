from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path("auth/register/", views.register, name="register"),
    path("auth/login/", views.login, name="login"),
    path("auth/logout/", views.logout, name="logout"),
    path("auth/me/", views.me, name="me"),
    path("auth/token/refresh/", views.refresh_token_view, name="token_refresh"),
    
    # OTP Endpoints
    path("auth/send-register-otp/", views.send_register_otp, name="send_register_otp"),
    path("auth/verify-register-otp/", views.verify_register_otp, name="verify_register_otp"),
    path("auth/password/reset/request/", views.request_password_reset, name="request_password_reset"),
    path("auth/password/reset/verify/", views.verify_password_reset, name="verify_password_reset"),
    path("auth/password/reset/confirm/", views.confirm_password_reset, name="confirm_password_reset"),
    
    path("doctors/online/", views.doctors_online, name="doctors_online"),
    path("doctors/status/", views.update_doctor_status, name="doctor_status"),
    path("doctors/public-key/", views.update_public_key, name="doctor_pubkey"),
    path("doctors/profile/", views.doctor_profile, name="doctor_profile"),
    path("doctors/", views.doctors_list, name="doctors_list"),
]
