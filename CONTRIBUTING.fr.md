# Contribuer à Ancestors

Tout d'abord, merci de prendre le temps de contribuer à **Ancestors** ! Ce sont les contributions comme la vôtre qui font d'Ancestors un outil d'exception pour tous.

---

## 🛠️ Cycle de Développement

Nous suivons un cycle de développement clair et structuré pour garantir la qualité du code et des déploiements automatisés sans interruption de service.

### 1. Modèle de Branches

Développez toujours vos fonctionnalités ou correctifs sur des branches dédiées. Ne commitez jamais directement sur la branche principale `main` ou `master`.
*   **Branches de Fonctionnalités** : Préfixées par `feat/` (ex: `feat/carte-interactive`).
*   **Branches de Correctifs** : Préfixées par `fix/` (ex: `fix/annee-bissextile`).
*   **Maintenance & Tâches diverses** : Préfixées par `chore/` ou `refactor/`.

### 2. Soumettre une Pull Request (PR)

*   Poussez votre branche sur GitHub.
*   Ouvrez une Pull Request ciblant `main`.
*   Vérifiez que toutes les validations locales passent avec succès (voir [Validation du Code](#validation-du-code)).
*   Attendez la revue de code et le passage des tests du pipeline GitHub Actions. Une fois approuvée, la branche peut être fusionnée dans `main`, ce qui déclenchera automatiquement une nouvelle version sémantique.

---

## 📝 Format des Commits (Conventional Commits + Gitmojis)

Pour piloter notre chaîne de déploiement continu et générer automatiquement le journal des modifications (changelog), nous appliquons strictement le format **Conventional Commits** complété par des codes **Gitmojis**.

Chaque message de commit doit respecter scrupuleusement le gabarit suivant :

```text
<type>(<scope>): <gitmoji> <sujet>
```

### 1. Types de Commits
*   `feat` : Une nouvelle fonctionnalité (déclenche une release mineure).
*   `fix` : Un correctif de bug (déclenche une release de patch).
*   `chore` : Tâche de maintenance, mise à jour de dépendances ou fichiers de configuration.
*   `docs` : Modifications de la documentation.
*   `refactor` : Modification du code qui n'ajoute pas de fonctionnalité et ne corrige pas de bug.
*   `style` : Modification d'écriture esthétique (CSS, espacements, Prettier, etc.).

### 2. Gitmojis

Insérez le code Gitmoji correspondant juste *après* le deux-points. Voici les codes les plus courants :

*   `:sparkles:` (✨) - Nouvelles fonctionnalités
*   `:bug:` (🐛) - Correctifs de bugs
*   `:books:` (📚) - Modifications de documentation
*   `:wrench:` (🔧) - Outil de build ou ajustements de configuration
*   `:art:` (🎨) - Améliorations CSS ou design de l'interface
*   `:recycle:` (♻️) - Refactoring du code
*   `:zap:` (⚡️) - Amélioration des performances
*   `:tada:` (🎉) - Initialisation du projet ou jalons majeurs

### 3. Exemples
*   `feat(people): :sparkles: add smart duplicates detection page`
*   `fix(timeline): :bug: resolve layout bug on chronological rendering`
*   `chore(ci): :wrench: add semantic-release build configurations`

---

## 🔍 Validation du Code

Avant de soumettre votre Pull Request, assurez-vous que les commandes suivantes s'exécutent avec succès en local pour éviter de faire échouer le pipeline de CI/CD :

### 1. Schéma de Base de Données
Si vous modifiez le schéma de base de données (`prisma/schema.prisma`), assurez-vous de générer et d'appliquer la migration correspondante :
```bash
npx prisma migrate dev --name <nom-de-votre-migration>
```

### 2. Compilation Générale
Compilez localement l'application Next.js pour certifier l'absence d'erreurs TypeScript ou de build :
```bash
npm run dev
# Ou pour vérifier le build de production :
npm run build
```

---

Merci encore pour votre engagement dans le projet **Ancestors** ! Bon code ! 🌳
