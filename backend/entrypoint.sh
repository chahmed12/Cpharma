#!/bin/sh

# On attend que la base de données soit disponible sur le réseau Docker
echo "Attente de la base de données PostgreSQL sur ${POSTGRES_HOST}:${POSTGRES_PORT}..."
while ! nc -z "${POSTGRES_HOST}" "${POSTGRES_PORT}"; do
  sleep 0.1
done
echo "PostgreSQL est prêt !"

# On applique les migrations automatiquement
echo "Application des migrations Django..."
python manage.py migrate --no-input

# Collecte des fichiers statiques
echo "Collecte des fichiers statiques..."
python manage.py collectstatic --no-input

# On lance le serveur ASGI (Daphne) pour gérer HTTP + WebSockets
echo "Lancement du serveur Daphne sur le port 8000..."
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
