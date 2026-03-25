"""
accounts/tests.py
=================
Tests d'intégration pour l'authentification via l'API REST.

Stratégie de test :
  - On utilise l'APITestCase de DRF qui fournit un client HTTP simulé.
  - Les tokens JWT sont envoyés via cookies HttpOnly → on vérifie les cookies
    dans les réponses, PAS dans le corps JSON.
  - Les mots de passe de fixture respectent le min_length=10 et les validateurs
    de settings.py.
"""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.throttling import AnonRateThrottle

AnonRateThrottle.rate = None

User = get_user_model()

# ── Helpers ───────────────────────────────────────────────────────────────────

REGISTER_URL = "/api/auth/register/"
LOGIN_URL = "/api/auth/login/"
LOGOUT_URL = "/api/auth/logout/"
ME_URL = "/api/auth/me/"
REFRESH_URL = "/api/auth/token/refresh/"

VALID_PASSWORD = "TestCPharma2026!"  # ≥ 10 chars, mixte, non commun


def _make_user(
    email="doctor@test.com",
    password=VALID_PASSWORD,
    role="MEDECIN",
    active=True,
    verified=True,
):
    """Crée et retourne un utilisateur en base pour les tests."""
    user = User.objects.create_user(
        email=email,
        username=email,  # AbstractUser exige username
        password=password,
        nom="Smith",
        prenom="Doc",
        role=role,
        is_active=active,
    )
    user.is_verified = verified
    user.save()
    return user


# ─────────────────────────────────────────────────────────────────────────────
#  REGISTER
# ─────────────────────────────────────────────────────────────────────────────


class RegisterTests(APITestCase):
    def test_register_pharmacien_success(self):
        """Une inscription PHARMACIEN valide retourne 201 et crée l'entrée en base."""
        payload = {
            "email": "pharmacien@test.com",
            "password": VALID_PASSWORD,
            "nom": "Doe",
            "prenom": "John",
            "role": "PHARMACIEN",
        }
        res = self.client.post(REGISTER_URL, payload, format="json")

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="pharmacien@test.com").exists())

        user = User.objects.get(email="pharmacien@test.com")
        self.assertFalse(
            user.is_verified, "Le compte doit être non-vérifié à la création."
        )

    def test_register_medecin_success(self):
        """Une inscription MEDECIN valide retourne 201 et crée un DoctorProfile."""
        from apps.accounts.models import DoctorProfile

        payload = {
            "email": "medecin@test.com",
            "password": VALID_PASSWORD,
            "nom": "Ibn",
            "prenom": "Sina",
            "role": "MEDECIN",
            "specialite": "Cardiologie",
            "numero_ordre": "DZ-12345",
        }
        res = self.client.post(REGISTER_URL, payload, format="json")

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="medecin@test.com")
        self.assertTrue(DoctorProfile.objects.filter(user=user).exists())

    def test_register_admin_role_blocked(self):
        """Tenter de s'inscrire avec le rôle ADMIN doit retourner 400."""
        payload = {
            "email": "hacker@test.com",
            "password": VALID_PASSWORD,
            "nom": "Hacker",
            "prenom": "Man",
            "role": "ADMIN",
        }
        res = self.client.post(REGISTER_URL, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_too_short(self):
        """Un mot de passe de moins de 10 caractères doit retourner 400."""
        payload = {
            "email": "short@test.com",
            "password": "Short1!",  # 7 chars < 10
            "nom": "Short",
            "prenom": "Pass",
            "role": "PHARMACIEN",
        }
        res = self.client.post(REGISTER_URL, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email(self):
        """Deux inscriptions avec le même email doivent retourner 400."""
        _make_user(email="duplicate@test.com")
        payload = {
            "email": "duplicate@test.com",
            "password": VALID_PASSWORD,
            "nom": "Dup",
            "prenom": "User",
            "role": "PHARMACIEN",
        }
        res = self.client.post(REGISTER_URL, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
#  LOGIN
# ─────────────────────────────────────────────────────────────────────────────


class LoginTests(APITestCase):
    def setUp(self):
        self.user = _make_user(email="doctor@test.com", active=True)

    def test_login_success_returns_200_and_cookies(self):
        """
        Un login valide retourne 200, le cookie access_token est positionné,
        et le corps JSON contient l'objet 'user' (sans token).
        """
        res = self.client.post(
            LOGIN_URL,
            {
                "email": "doctor@test.com",
                "password": VALID_PASSWORD,
            },
            format="json",
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Vérification : les tokens sont dans les cookies, PAS dans le JSON
        self.assertIn(
            "access_token",
            res.cookies,
            "Le cookie 'access_token' doit être positionné.",
        )
        self.assertIn(
            "refresh_token",
            res.cookies,
            "Le cookie 'refresh_token' doit être positionné.",
        )

        # Le cookie doit être HttpOnly
        self.assertTrue(
            res.cookies["access_token"]["httponly"],
            "Le cookie access_token doit être HttpOnly.",
        )

        # Le corps JSON contient les infos user mais PAS de token
        self.assertIn("user", res.data)
        self.assertNotIn("access", res.data, "Le token ne doit PAS être dans le JSON.")
        self.assertNotIn("refresh", res.data, "Le token ne doit PAS être dans le JSON.")
        self.assertEqual(res.data["user"]["email"], "doctor@test.com")

    def test_login_wrong_password_returns_401(self):
        """Un mauvais mot de passe doit retourner 401 sans cookie."""
        res = self.client.post(
            LOGIN_URL,
            {
                "email": "doctor@test.com",
                "password": "WrongPassword!",
            },
            format="json",
        )

        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("access_token", res.cookies)

    def test_login_unknown_email_returns_401(self):
        """Un email inconnu doit retourner 401."""
        res = self.client.post(
            LOGIN_URL,
            {
                "email": "nobody@test.com",
                "password": VALID_PASSWORD,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_fields_returns_400(self):
        """Un login sans email ni mot de passe doit retourner 400."""
        res = self.client.post(LOGIN_URL, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
#  REFRESH TOKEN
# ─────────────────────────────────────────────────────────────────────────────


class RefreshTokenTests(APITestCase):
    def setUp(self):
        self.user = _make_user(email="refresh@test.com", active=True)
        # On se connecte pour obtenir les cookies
        self.client.post(
            LOGIN_URL,
            {
                "email": "refresh@test.com",
                "password": VALID_PASSWORD,
            },
            format="json",
        )

    def test_refresh_with_valid_cookie_returns_200(self):
        """Un refresh valide (cookie présent) retourne 200 et renouvelle access_token."""
        res = self.client.post(REFRESH_URL, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", res.cookies)

    def test_refresh_without_cookie_returns_401(self):
        """Un appel à /refresh/ sans cookie de refresh doit retourner 401."""
        self.client.cookies.clear()
        res = self.client.post(REFRESH_URL, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


# ─────────────────────────────────────────────────────────────────────────────
#  LOGOUT & ME
# ─────────────────────────────────────────────────────────────────────────────


class LogoutAndMeTests(APITestCase):
    def setUp(self):
        self.user = _make_user(email="logoutme@test.com", active=True)
        self.client.post(
            LOGIN_URL,
            {
                "email": "logoutme@test.com",
                "password": VALID_PASSWORD,
            },
            format="json",
        )

    def test_me_returns_user_data(self):
        """/auth/me/ retourne les données de l'utilisateur connecté."""
        res = self.client.get(ME_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["email"], "logoutme@test.com")

    def test_logout_clears_cookies(self):
        """Après logout, les cookies d'auth doivent être supprimés."""
        res = self.client.post(LOGOUT_URL, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Les cookies supprimés ont une valeur vide
        self.assertEqual(
            res.cookies.get("access_token", None) and res.cookies["access_token"].value,
            "",
        )

    def test_me_after_logout_returns_401(self):
        """Après logout, /auth/me/ doit retourner 401."""
        self.client.post(LOGOUT_URL, format="json")
        self.client.cookies.clear()
        res = self.client.get(ME_URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
