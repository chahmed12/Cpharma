<div align="center">
  
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/React-Dark.svg" height="70" alt="React" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/TypeScript.svg" height="70" alt="TypeScript" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Django.svg" height="70" alt="Django" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Docker.svg" height="70" alt="Docker" />

  <br><br>

  <h1>⚕️ Cpharma — Télémédecine Hautement Sécurisée</h1>
  <p><em>Téléconsultation P2P, Cryptographie PKI & Gestion de point de vente officine</em></p>
  
  <p>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" /></a>
    <a href="https://www.djangoproject.com/"><img src="https://img.shields.io/badge/Backend-Django_5_%2B_Channels-092E20?style=for-the-badge&logo=django" /></a>
    <img src="https://img.shields.io/badge/Realtime-WebRTC_%2B_WebSockets-E34F26?style=for-the-badge&logo=html5" />
    <img src="https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge" alt="Status" />
  </p>
</div>

---

## 📖 Introduction au Projet

**Cpharma** est une solution complète de télémédecine conçue pour numériser parfaitement la chaîne médicale : **Patient ➔ Médecin ➔ Pharmacien**. Pensée avec une obsession pour la sécurité (cryptographie navigateur, signatures asymétriques), la plateforme empêche toute fraude à l'ordonnance et assure une mise en relation vidéo en temps réel ultra-stable. 

L'architecture robuste et "Production-Ready" est le fruit d'une ingénierie avancée, incluant des correctifs anticorrution de données et des communications unifiées.

---

## ✨ Features & Fonctionnalités

### 👨‍⚕️ Accès Médecin (Dashboard & Consultation)
- **Consultation Vidéo HD (WebRTC P2P)** : Flux audio/vidéo crypté de bout-en-bout (DTLS/SRTP) avec fallback automatique (sans caméra).
- **Salle d'Attente Automatisée** : Événements temps-réel via `Django Channels` et signalement instantané d'un nouveau patient.
- **Rédaction & Signature** : Ordonnancier intelligent couplé au système de cryptographie local.

### 🔐 Architecture de Sécurité Inviolable (Module PKI)
- **Algorithme RSA-PSS / SHA-256** : Génération des paires de clés asymétriques directement dans le navigateur du médecin (`IndexedDB`) via l'API WebCrypto.
- **Sérialisation Canonique** : L'empreinte JSON est structurée récursivement en _UTF-8 strict_ entre JS et Python pour assurer une vérification millimétrée au byte près. Aucune altération n'est tolérée par le Backend.
- **Vérification Pharmacien Anti-MITM** : Le certificat de l'ordonnance est re-vérifié cryptographiquement *par le navigateur du point de vente*, garantissant qu'aucun réseau ou hacker local n'a falsifié le statut `is_valid`.

### 💊 Environnement Pharmacien (Facturation & Point de Vente)
- **Délivrance Numérique** : Validation rapide des identifiants d'ordonnances (Hash). Une fois les médicaments distribués, l'ordonnance est marquée stricte avec `is_dispensed=True` pour bloquer la sur-délivrance.
- **Système Financier Atomisée** : Le backend garantit la cohérence (`DB transaction.atomic`) entre l'aboutissement de la consultation WebRTC, le statut payé, et le calcul (taux fractionnés : commission plateforme + rétribution médecine).

---

## 🛠️ Stack Technologique Détaillée

| Couche | Technologies | Utilité Principale |
|--------|--------------|------|
| **Frontend** | React 18, TypeScript, Tailwind | Rendu Client (SPA), UI réactive de grade supérieur. |
| **Backend** | Python, Django, DRF, Channels | API RESTfully, Routage WebSocket asynchrone sécurisé. |
| **Realtime Signaling** | WebRTC, WebSockets, Redis | P2P Video negotiation, Events Broker et Cache Memoire. |
| **Infrastucture** | Docker, Compose, PostgreSQL | ORM transactionnel relationnel, Containerisation complète. |
| **Déploiement & Qualité** | GitHub Actions, Vitest | CI/CD automatisé, File d'attente WebRTC Testée et validée (TDD). |

---

## 🚀 Lancement Rapide & Déploiement

Le système tourne de manière fluide sur n'importe quel hyperviseur grâce à sa conteneurisation intégrale.

### 1. Prérequis Système
- [Docker Engine](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

### 2. Démarrage de l'Infrastructure (One-Liner)
Au sein de la racine du fichier de configuration :
```bash
docker-compose up --build -d
```
Les 4 services (DB Postgres, Redis Broker, Django Backend port `:8000`, React Frontend proxy) s'aligneront automatiquement de concert.

### 3. Première Configuration
Création des schémas de base de données initiaux et du super-administrateur :
```bash
# Vérification ou application de schéma
docker exec -it cpharma_backend_1 python manage.py migrate
# Création admin du portail
docker exec -it cpharma_backend_1 python manage.py createsuperuser
```

---

## 🧬 Décisions d'Ingénierie & Patterns
* **WebRTC Authentifié** : Les canaux de vidéo-diffusion rejettent tous les `anonymes`. Seuls _le_ Docteur assigné et _le_ Patient concerné peuvent passer le handshake (`Session ID Matching`).
* **Protection Race-Condition** : L'extinction des flux (`Hangup`) exécute un ping de fermeture asynchrone pour éviter que l'un des postes maintienne un zombie state sur le Socket.
* **Environnement Agnostique** : URL dynamiques et variables `import.meta.env` + `django.conf.settings` évitent le hardcoding (les commissions et portails WS s'adaptent instantanément à la prod via variables docker).
* **Résilience Client Interne (ErrorBoundary & Auto-reconnect)** : Les erreurs JS non gérées sont confinées pour éviter les écrans blancs (White Screen of Death). Lors de coupures de réseau soudaines, le WebSocket embarque un **Exponential Backoff Algorithme** garantissant le rétablissement automatique (jusqu'à 30s max) de la communication.
* **Sécurité des Données & Vie Privée (At-Rest Encryption)** : Les dossiers médicaux (allergies, antécédents, typage sanguin) sont directement encodés via _Fernet Symétrique AES-128-CBC_, interdisant aux administrateurs de la BDD tout espionnage sans la `FERNET_KEY`.

---
<div align="center">
  <sub>Propulsé avec passion et ingénierie de pointe. © 2026 Cpharma</sub>
</div>
