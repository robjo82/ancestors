# Contributing to Ancestors

First off, thank you for taking the time to contribute to **Ancestors**! It's people like you who make Ancestors a premium tool for everyone.

---

## 🛠️ Development Workflow

We follow a clean, structured workflow to ensure code quality and seamless automated deployments.

### 1. Branching Model

Always develop features or bugfixes in specialized branches, and never commit directly to the `main` or `master` branch.
*   **Feature branches**: Prefix with `feat/` (e.g., `feat/interactive-map`).
*   **Bugfix branches**: Prefix with `fix/` (e.g., `fix/date-leap-year`).
*   **Chore / Maintenance**: Prefix with `chore/` or `refactor/`.

### 2. Opening a Pull Request

*   Push your branch to GitHub.
*   Open a Pull Request targeting `main`.
*   Ensure that all local checks pass (see [Code Validation](#code-validation)).
*   Await code review and automated GitHub Actions verification. Once approved, the branch can be merged to `main`, which automatically builds a new semantic release.

---

## 📝 Commit Message Guidelines

To maintain an automated, semantic release pipeline, we strictly enforce the **Conventional Commits** format coupled with **Gitmojis**. 

Every commit message must follow this exact template:

```text
<type>(<scope>): <gitmoji> <subject>
```

### 1. Types
*   `feat`: A new feature (corresponds to a minor release).
*   `fix`: A bug fix (corresponds to a patch release).
*   `chore`: Tooling, configs, or package updates (no production changes).
*   `docs`: Documentation changes.
*   `refactor`: Code changes that neither fix a bug nor add a feature.
*   `style`: Formatting or styling changes (CSS, prettier, etc.).

### 2. Gitmojis

Append the corresponding Gitmoji code *after* the colon. Here are the most common codes:

*   `:sparkles:` (✨) - New features
*   `:bug:` (🐛) - Bug fixes
*   `:books:` (📚) - Documentation changes
*   `:wrench:` (🔧) - Tooling or configuration adjustments
*   `:art:` (🎨) - CSS / UI design improvements
*   `:recycle:` (♻️) - Refactoring code
*   `:zap:` (⚡️) - Performance enhancements
*   `:tada:` (🎉) - Initial commit or project releases

### 3. Examples
*   `feat(people): :sparkles: add smart duplicates detection page`
*   `fix(timeline): :bug: resolve layout bug on chronological rendering`
*   `chore(ci): :wrench: add semantic-release build configurations`

---

## 🔍 Code Validation

Before submitting a Pull Request, please ensure the following validations pass locally to prevent CI pipeline failures:

### 1. Database Schema
If you updated the Prisma schema (`prisma/schema.prisma`), make sure you run:
```bash
npx prisma migrate dev --name <migration-name>
```

### 2. Compilation and Types check
Compile the Next.js application to guarantee zero TypeScript or Next.js build errors:
```bash
npm run build
```

---

Thank you again for contributing to **Ancestors**! Happy coding! 🌳
