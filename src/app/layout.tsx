import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ancestors - Votre Généalogie Moderne",
  description: "Découvrez, organisez et explorez l'arbre généalogique de votre famille avec une interface premium, fluide et moderne.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="app-container">
        <header className="navbar glass">
          <div className="navbar-logo">
            🌳 <span>Ancestors</span>
          </div>
          <nav className="navbar-links">
            <a href="/" className="navbar-link">📊 Tableau de bord</a>
            <a href="/tree" className="navbar-link">🌿 Arbre Interactif</a>
            <a href="/people" className="navbar-link">📇 Annuaire</a>
            <a href="/statistics" className="navbar-link">📈 Statistiques</a>
            <a href="/import-export" className="navbar-link">📤 Import / Export</a>
          </nav>
        </header>

        <main className="main-content">
          {children}
        </main>

        <footer className="footer">
          <p>© {new Date().getFullYear()} Ancestors. Fait avec passion pour la famille et l'histoire.</p>
        </footer>
      </body>
    </html>
  );
}
