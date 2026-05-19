# Etape 1 : Build
FROM node:24-alpine AS builder
WORKDIR /app

# Installer les dépendances
COPY package*.json ./
RUN npm ci

# Copier le schéma et générer le Client Prisma
COPY prisma ./prisma/
RUN npx prisma generate

# Copier le reste du projet et compiler Next.js
COPY . .
# Désactiver le check eslint durant le build docker pour éviter les faux-positifs
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Etape 2 : Runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Récupérer les fichiers nécessaires
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/tsconfig.json ./

# Exposer le port par défaut
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Lancer les migrations Prisma au démarrage pour initialiser la base SQLite persistante, puis démarrer le serveur
CMD npx prisma migrate deploy && npm run start
