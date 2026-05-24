import { prisma } from "../../../lib/db";
import NewPersonClientForm from "./NewPersonClientForm";
import { getCurrentUser, getActiveTreeIdForUser } from "../../../lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewPersonPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?clear=true");
  }

  const activeTreeId = await getActiveTreeIdForUser(user.id);

  // Récupérer la liste des pères et mères potentiels pour les menus déroulants
  const males = await prisma.person.findMany({
    where: { gender: "M", treeId: activeTreeId },
    orderBy: [
      { lastName: "asc" },
      { firstName: "asc" },
    ],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      deathDate: true,
    },
  });

  const females = await prisma.person.findMany({
    where: { gender: "F", treeId: activeTreeId },
    orderBy: [
      { lastName: "asc" },
      { firstName: "asc" },
    ],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      deathDate: true,
    },
  });

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section className="glass" style={{ padding: "2rem" }}>
        <h1 className="title-font" style={{ fontSize: "2rem", color: "var(--accent-gold)", fontWeight: 700, marginBottom: "0.25rem" }}>
          ➕ Nouvel Individu
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Ajoutez manuellement une nouvelle personne à votre arbre généalogique.
        </p>
      </section>

      <NewPersonClientForm males={males} females={females} />
    </div>
  );
}
