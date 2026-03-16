# 🏥 Cpharma — Plateforme de Téléconsultation Médicale & Pharmaceutique

> **Cpharma** est une application moderne de santé connectée permettant aux pharmaciens de mettre en relation leurs patients avec des médecins via une interface de téléconsultation en temps réel (vidéo/chat).

---

## ✨ Fonctionnalités Clés

### 🩺 Pour les Médecins
*   **Tableau de Bord Temps Réel :** Gestion de la file d'attente des patients envoyés par les pharmacies.
*   **Téléconsultation HD :** Appels vidéo et chat textuel via WebRTC sécurisé.
*   **Prescriptions Numériques :** Génération et signature électronique d'ordonnances sécurisées.
*   **Historique des Soins :** Accès rapide aux motifs de consultation et dossiers patients.

### 💊 Pour les Pharmaciens
*   **Gestion des Consultations :** Enregistrement des patients et mise en relation directe avec les médecins disponibles.
*   **Salle d'Attente Interactive :** Suivi en temps réel de l'état d'avancement de la consultation du patient.
*   **Vérification d'Ordonnances :** Réception et validation instantanée des ordonnances signées par le médecin.
*   **Encaissement Intégré :** Gestion des paiements pour les consultations et médicaments.

---

## 🛠️ Stack Technologique

### Backend (API & Temps Réel)
*   **Framework :** [Django 4.2](https://www.djangoproject.com/) & [Django REST Framework](https://www.django-rest-framework.org/)
*   **Temps Réel :** [Django Channels](https://channels.readthedocs.io/) (WebSockets)
*   **Base de Données :** [PostgreSQL](https://www.postgresql.org/)
*   **Cache & Messages :** [Redis](https://redis.io/)
*   **Sécurité :** JWT Authentication (SimpleJWT)

### Frontend (Interface Utilisateur)
*   **Framework :** [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool :** [Vite](https://vitejs.dev/)
*   **Design :** [TailwindCSS 4](https://tailwindcss.com/) & [Lucide React](https://lucide.dev/) (Icônes)
*   **Communication :** [Axios](https://axios-http.com/) & [WebRTC](https://webrtc.org/)

---

## 📂 Structure du Projet

```bash
Cpharma/
├── backend/            # API Django & WebSocket Logic
│   ├── apps/           # Modules métier (accounts, consultations, prescriptions, payments)
│   ├── config/         # Configuration du projet (settings.py, asgi.py, wsgi.py)
│   └── manage.py       # CLI Django
├── frontend/           # Application React (Single Page Application)
│   ├── src/
│   │   ├── components/ # UI réutilisable
│   │   ├── pages/      # Vues principales (Dashboards, Vidéo, Formulaires)
│   │   ├── services/   # Appels API (Axios)
│   │   └── context/    # État global (Auth, Consultation)
│   └── index.html
└── nginx/              # Configuration du serveur web (en cours)
```

---

## 🚀 Guide de Démarrage Rapide

### 1. Prérequis
*   Python 3.10+
*   Node.js 18+
*   Redis (installé et lancé sur le port 6379)
*   PostgreSQL

### 2. Installation Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Ou venv\Scripts\activate sur Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. Installation Frontend
```bash
cd frontend
npm install
npm run dev
```
Accédez à l'application via `http://localhost:5173`.

---

## 🗺️ Feuille de Route & Améliorations
- [ ] **Dockerisation :** Déploiement simplifié via Docker Compose.
- [ ] **Dossier Médical Persistant :** Historique complet pour chaque patient.
- [ ] **Sécurité Avancée :** Chiffrement de bout en bout des ordonnances.
- [ ] **Notifications Push :** Alertes mobiles pour les médecins et pharmaciens.

---

## 📄 Licence & Contact
Ce projet est développé dans le cadre d'une solution de santé numérique.
*   **Auteur :** [Votre Nom/Organisation]
*   **Support :** [Email ou lien support]

---
🚀 *Cpharma — Connecter le soin, simplifier la santé.*
