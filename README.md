# 🌳 Ancestors

> The ultimate, high-performance, and beautifully engineered open-source genealogy software.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-blue.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-indigo.svg)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

**Ancestors** is a modern, responsive, and feature-rich genealogy platform designed to handle small family trees as well as massive databases (1,000+ individuals). Designed with a strong focus on ergonomics, fluid micro-interactions, and premium UI animations (such as Virtual Placeholders and haptic-style click scaling), Ancestors is easy to use for elderly users and powerful enough for dedicated genealogists.

---

## 🌟 Key Features

*   **Figma-Style Drag & Drop Tree**: A completely interactive family tree visualizer with virtual placeholders. Drag unconnected members from a sidebar and drop them directly onto a placeholder to link relations dynamically.
*   **Smart Duplicates Detection & Merge (Smart Merge)**: A fuzzy-matching engine that groups homonyms, similar first names, and compatible birth dates. Resolve conflicts in a premium 3-column side-by-side selective merger to consolidate your database cleanly.
*   **One-Click INSEE MatchID Integration**: Look up deceased individuals directly from the official French INSEE registry. Extract birth/death dates and locations in a split second and import them with one click.
*   **Direct FamilySearch Integration**: Fully configured OAuth 2.0 connection enabling direct API queries to search historical records and seamlessly pull dates, parentage, and media files.
*   **Targeted Date Parsing & Consistency**: Automated real-time chronological checks (e.g., child born before parent, death before birth) to maintain a healthy tree.

---

## 🛠️ Tech Stack

*   **Core**: Next.js 16 (App Router), React, TypeScript.
*   **Styling**: Vanilla CSS, variables-based premium dark/light/sepia color palettes.
*   **Database**: SQLite (easy persistency, standard relational format).
*   **ORM**: Prisma client.
*   **Deployment**: Multi-stage lightweight Docker image, automated GitHub Actions CI/CD.

---

## 📦 Getting Started

### Prerequisites

*   **Node.js** >= 20.0
*   **npm** or **yarn**

### Local Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/robjo82/ancestors.git
    cd ancestors
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure environment variables**:
    Create a `.env` file in the root directory:
    ```env
    # Server configuration
    JWT_SECRET="generate-a-secure-random-key-here"
    PORT=3000

    # FamilySearch Integration (optional)
    FAMILYSEARCH_CLIENT_ID="your-developer-client-id"
    FAMILYSEARCH_CLIENT_SECRET="your-developer-client-secret"
    FAMILYSEARCH_ENV="sandbox" # or "production"
    NEXT_PUBLIC_APP_URL="http://localhost:3000"
    ```

4.  **Run Database Migrations**:
    ```bash
    npx prisma migrate dev
    ```

5.  **Start the development server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to see your app in action!

---

## 🐳 Docker & Portainer Deployment

### Docker Compose

Ancestors can be containerized using the following lightweight, highly optimized `docker-compose.yml` file:

```yaml
services:
  ancestors:
    image: registry.robin-joseph.fr/ancestors:latest
    container_name: ancestors_app
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-production-secret
      - PORT=3000
      - FAMILYSEARCH_CLIENT_ID=your-client-id
      - FAMILYSEARCH_ENV=production
      - NEXT_PUBLIC_APP_URL=https://your-domain.fr
    volumes:
      - ancestors_db:/app/prisma
      - ancestors_media:/app/public/uploads
    restart: unless-stopped

volumes:
  ancestors_db:
  ancestors_media:
```

### Deploying on Portainer

1.  Go to **Portainer Web UI** > **Stacks** > **Add stack**.
2.  Paste the Docker Compose configuration above.
3.  Fill in your specific environment variables (like `JWT_SECRET`).
4.  Click **Deploy the stack**.

---

## 🤝 Contributing

We welcome contributions from developers of all skill levels!

1.  Fork the Project.
2.  Create your Feature Branch (`git checkout -b feat/amazing-feature`).
3.  Commit your changes following the **Conventional Commits & Gitmojis** specifications:
    *   Example: `feat(tree): :sparkles: add custom branch color coding`
4.  Push to the Branch (`git push origin feat/amazing-feature`).
5.  Open a Pull Request.

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
