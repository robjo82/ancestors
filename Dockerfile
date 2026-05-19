# Etape 1 : Dépendances et compilation
FROM node:24-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Installer les dépendances (y compris les devDependencies nécessaires pour la compilation)
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copier le schéma et générer le Client Prisma
COPY prisma ./prisma/
RUN npx prisma generate

# Copier le reste du code de l'application
COPY . .

# Désactiver le check eslint et le telemetry durant le build docker
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Etape 2 : Runner de production léger
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Exposer le port par défaut
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Récupérer les assets publics
COPY --from=builder /app/public ./public

# Récupérer le bundle Next.js standalone compilé (très léger, sous les 50MB)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Récupérer Prisma et ses fichiers de migration pour pouvoir exécuter les migrations en production
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/tsconfig.json ./

# Récupérer Prisma CLI de manière à pouvoir exécuter "npx prisma migrate deploy" au démarrage
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Lancer les migrations Prisma au démarrage pour initialiser la base SQLite, puis démarrer le serveur standalone
CMD npx prisma migrate deploy && node server.js
