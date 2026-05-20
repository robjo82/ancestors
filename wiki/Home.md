# Welcome to the Ancestors Wiki 🌳

Welcome to the official documentation and knowledge base for **Ancestors**, a premium, high-performance, and beautifully engineered open-source genealogy software.

Whether you are a developer looking to contribute, a system administrator deploying the app for your friends, or an advanced researcher studying trees of thousands of people, this wiki will guide you through the architecture, deployment, and custom options of the platform.

---

## 🎨 Our Design & Ergonomic Philosophy

Ancestors is built around a single, non-negotiable principle: **Genealogy software does not have to look like it was designed in 1995.** 

Traditional software is often cluttered, unintuitive, and visually painful to navigate. Ancestors breaks this mold by applying modern, top-tier design practices:

1.  **Seniors-Inclusive, not Seniors-First**: 
    Our primary users are often elderly relatives who are the keepers of family histories, but we avoid "patronizing" designs with oversized elements. Instead, we use elegant micro-animations (like a 4% haptic-style scale reduction upon button clicks), clear typography (Inter / Outfit), and soft contrasts to provide immediate visual feedback.
2.  **Figma-like Spatial Navigation**:
    Visualizing a tree of 1,000+ people is a spatial problem. Our tree uses a high-performance grid, virtual dotted cibles ("Add Father", "Add Mother") on hover, and direct Drag & Drop interfaces that feel as fluid and tactile as modern design editors.
3.  **Maximum Automation (Respecting Your Time)**:
    Genealogy involves hours of tedious transcriptions. Ancestors integrates direct lookups into public death records (INSEE) and historical vaults (FamilySearch) to pull data, relations, and certificates directly into profiles in a single click.

---

## 📚 Documentation Directory

To get started with Ancestors, explore the following pages:

*   **[Deployment Guide](Deployment.md)**: Standard and advanced setups (Docker Compose, Portainer, reverse-proxies like Nginx & Caddy, SSL Let's Encrypt).
*   **[Architecture & Tech Stack](Architecture.md)**: Explore how Next.js App Router, Prisma ORM, andSQLite are engineered together to provide a robust, single-file-persistency SaaS platform.
*   **[Contributing Guide](../CONTRIBUTING.md)**: Details on branch naming, Conventional Commits, and Gitmoji specifications.
