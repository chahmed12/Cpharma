from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework import status

User = get_user_model()

class AuthTests(APITestCase):
    def test_register_success(self):
        data = {
            "email": "pharmacien@test.com",
            "password": "password123",
            "nom": "Doe",
            "prenom": "John",
            "role": "PHARMACIEN"
        }
        res = self.client.post('/api/auth/register/', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="pharmacien@test.com").exists())

    def test_register_admin_blocked(self):
        data = {
            "email": "hacker@test.com",
            "password": "password123",
            "nom": "Hacker",
            "prenom": "Man",
            "role": "ADMIN"
        }
        res = self.client.post('/api/auth/register/', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_success(self):
        user = User.objects.create_user(
            email='doctor@test.com', 
            password='password123',
            nom='Smith',
            prenom='Doc',
            role='MEDECIN'
        )
        user.is_active = True
        user.save()

        res = self.client.post('/api/auth/login/', {
            "email": "doctor@test.com",
            "password": "password123"
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)

    def test_login_bad_password(self):
        user = User.objects.create_user(
            email='doctor2@test.com', 
            password='password123',
            nom='Smith',
            prenom='Doc',
            role='MEDECIN'
        )
        user.is_active = True
        user.save()

        res = self.client.post('/api/auth/login/', {
            "email": "doctor2@test.com",
            "password": "wrongpassword"
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
