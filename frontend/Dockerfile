# Étape 1 : Build de l'application React
FROM node:22-slim AS build

WORKDIR /app

# On installe les dépendances
COPY package*.json ./
RUN npm install

# Copier le reste du code
COPY . .

# Argument de build pour l'API URL
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Build de l'application (Vite génère le dossier /dist)
RUN npm run build

# Étape 2 : Service des fichiers statiques avec Nginx
FROM nginx:alpine

# Copie du build dans le dossier public de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Configuration Nginx personnalisée (Proxy API + Routage SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
