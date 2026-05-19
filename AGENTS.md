<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Standards & Releases

Every project in this workspace must strictly follow these structural and release guidelines:

1. **Version Control & Repository Management**:
   - Manage the project repository using Git.
   - Do not commit local SQLite database files, environment configuration files (`.env`), or dynamic uploads directories (e.g., `/public/uploads/*`).

2. **Commit Message Format (Conventional Commits + Gitmoji)**:
   - All commits must strictly adhere to the Conventional Commits format, appended with a standard Gitmoji code *after* the colon.
   - **Template**: `<type>(<scope>): <gitmoji> <subject>`
   - **Examples**:
     - `feat(people): :sparkles: add advanced genealogy stats page`
     - `fix(timeline): :bug: resolve layout bug on chronological rendering`
     - `chore(ci): :wrench: add semantic-release build configurations`
     - `feat(repo): :tada: initialize repository structure`

3. **CI/CD Pipeline with Automated Semantic Releases**:
   - Every project must include a `.github/workflows/release.yml` GitHub Actions pipeline that triggers on `main` or `master` pushes.
   - The workflow must check out the repo, install clean production dependencies, run the production build (`npm run build`), and execute `semantic-release` (`npx semantic-release`) with permissions to tag and write releases.
   - A `.releaserc.json` or equivalent configuration file must be present to configure the required release plugins (`@semantic-release/commit-analyzer`, `@semantic-release/release-notes-generator`, `@semantic-release/github`).

4. **Pull Requests, Branching & Code Review**:
   - Always push changes to GitHub when a task is finished, behaving as a professional developer.
   - Work on feature branches, open a Pull Request (PR) targeting `main` (or `master`), wait for GitHub Actions CI/CD validation to pass, and merge the PR.
   - Merging to `main`/`master` is safe and recommended as it builds new semantic releases automatically. The user will handle local manual deployments in their staging/production environments.
