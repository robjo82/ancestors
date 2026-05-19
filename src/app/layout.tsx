import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import NavbarClient from "./NavbarClient";

export const metadata: Metadata = {
  title: "Ancestors - Votre Généalogie Moderne",
  description: "Découvrez, organisez et explorez l'arbre généalogique de votre famille avec une interface premium, fluide et moderne.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  
  if (!user) {
    // Return fullscreen content for login/signup pages without navbar/footer
    return (
      <html lang="fr">
        <body className="app-container">
          <main style={{ flex: 1, minHeight: "100vh" }}>
            {children}
          </main>
        </body>
      </html>
    );
  }

  // Fetch trees for the logged-in user
  const trees = await prisma.tree.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true, description: true },
    orderBy: { createdAt: "asc" },
  });

  const cookieStore = await cookies();
  const activeTreeId = cookieStore.get("activeTreeId")?.value || (trees[0]?.id || null);

  return (
    <html lang="fr">
      <body className="app-container">
        <NavbarClient user={user} trees={trees} activeTreeId={activeTreeId} />

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
