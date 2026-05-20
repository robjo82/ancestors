# 🌳 Ancestors

> Le logiciel de généalogie open source ultime, ultra-performant et superbement conçu.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-blue.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-indigo.svg)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Pr%C3%AAt-blue.svg)](https://www.docker.com/)

**Ancestors** est une plateforme de généalogie moderne, réactive et ergonomique, spécialement conçue pour gérer aussi bien de petits arbres familiaux que des bases de données massives (plus de 1 000 individus). Pensé avec un souci maniaque du détail, des micro-interactions fluides et des animations premium (comme les cibles virtuelles ou le retour tactile virtuel de clic), Ancestors est intuitif pour les seniors et redoutablement efficace pour les généalogistes chevronnés.

---

## 🌟 Fonctionnalités Clés

*   **Arbre Interactif "Style Figma" (Drag & Drop)** : Un visualiseur d'arbre généalogique dynamique avec des cibles de parenté virtuelles en pointillés. Glissez des membres isolés depuis la barre latérale et déposez-les directement sur l'arbre pour lier les relations instantanément.
*   **Détection & Fusion de Doublons (Smart Merge)** : Un algorithme performant qui regroupe les homonymes, les prénoms approchants et les dates de naissance compatibles. Fusionnez vos fiches en un clin d'œil via un comparateur côte-à-côte sélectif en 3 colonnes.
*   **Intégration INSEE MatchID (Un clic)** : Interrogez instantanément le registre officiel des décès de l'INSEE. Trouvez et importez les dates et lieux de naissance/décès d'une personne disparue directement dans son profil sans aucune saisie.
*   **Intégration Directe FamilySearch** : Flux d'authentification OAuth 2.0 complet permettant d'interroger directement l'API de FamilySearch pour parcourir les archives mondiales et importer les données en un clic.
*   **Contrôle de Cohérence & Alertes** : Des règles de validation chronologiques automatiques alertent en temps réel en cas d'incohérences (ex: enfant né avant ses parents, décès avant la naissance).

---

## 🛠️ Stack Technique

*   **Cœur** : Next.js 16 (App Router), React, TypeScript.
*   **Design & Styles** : CSS natif optimisé, avec palettes de couleurs interchangeables (Sombre, Clair et Sépia doux pour reposer les yeux).
*   **Base de Données** : SQLite (persistance simplifiée par fichier, structure relationnelle robuste).
*   **ORM** : Prisma.
*   **Déploiement** : Image Docker multi-stage légère, workflow de CI/CD automatisé par GitHub Actions.

---

## 📦 Démarrage Rapide

### Prérequis

*   **Node.js** >= 20.0
*   **npm** ou **yarn**

### Installation Locale

1.  **Cloner le dépôt** :
    ```bash
    git clone https://github.com/robjo82/ancestors.git
    cd ancestors
    ```

2.  **Installer les dépendances** :
    ```bash
    npm install
    ```

3.  **Configurer les variables d'environnement** :
    Créez un fichier `.env` à la racine du projet :
    ```env
    # Configuration serveur
    JWT_SECRET="generez-une-cle-securisee-ici"
    PORT=3000

    # Intégration FamilySearch (optionnelle)
    FAMILYSEARCH_CLIENT_ID="votre-client-id-developpeur"
    FAMILYSEARCH_CLIENT_SECRET="votre-client-secret-developpeur"
    FAMILYSEARCH_ENV="sandbox" # ou "production"
    NEXT_PUBLIC_APP_URL="http://localhost:3000"
    ```

4.  **Lancer les migrations de Base de Données** :
    ```bash
    npx prisma migrate dev
    ```

5.  **Démarrer le serveur de développement** :
    ```bash
    npm run dev
    ```
    Ouvrez [http://localhost:3000](http://localhost:3000) pour tester l'application !

---

## 🐳 Déploiement Docker & Portainer

### Docker Compose

Ancestors peut être déployé en production en quelques secondes via ce fichier `docker-compose.yml` :

```yaml
services:
  ancestors:
    image: registry.robin-joseph.fr/ancestors:latest
    container_name: ancestors_app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=votre-cle-secrete-production
      - PORT=3000
      - FAMILYSEARCH_CLIENT_ID=votre-client-id
      - FAMILYSEARCH_ENV=production
      - NEXT_PUBLIC_APP_URL=https://votre-domaine.fr
    volumes:
      - ancestors_db:/app/prisma
      - ancestors_media:/app/public/uploads
    restart: unless-stopped

volumes:
  ancestors_db:
  ancestors_media:
```

### Déploiement sur Portainer

1.  Allez sur l'interface **Portainer** > **Stacks** > **Add stack**.
2.  Collez la configuration Docker Compose ci-dessus.
3.  Remplissez vos variables d'environnement spécifiques.
4.  Cliquez sur **Deploy the stack**.

---

## 🤝 Contribuer

Les contributions de toute la communauté sont les bienvenues !

1.  Forkez le projet.
2.  Créez votre branche de fonctionnalité (`git checkout -b feat/ma-super-feature`).
3.  Commitez vos changements en respectant le format **Conventional Commits & Gitmojis** :
    *   Exemple : `feat(tree): :sparkles: add custom branch color coding`
4.  Poussez sur votre branche (`git push origin feat/ma-super-feature`).
5.  Ouvrez une Pull Request.

Consultez [CONTRIBUTING.fr.md](CONTRIBUTING.fr.md) pour plus de détails.

---

## 📄 Licence

Distribué sous la licence libre MIT. Voir [LICENSE](LICENSE) pour plus d'informations.
