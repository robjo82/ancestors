import { prisma } from "../../lib/db";
import InteractiveTreeClient from "./InteractiveTreeClient";
import { getCurrentUser, getActiveTreeIdForUser } from "../../lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TreePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?clear=true");
  }

  const activeTreeId = await getActiveTreeIdForUser(user.id);

  // Charger l'intégralité des individus et mariages de la base de données
  const people = await prisma.person.findMany({
    where: { treeId: activeTreeId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gender: true,
      birthDate: true,
      deathDate: true,
      occupation: true,
      avatarUrl: true,
      fatherId: true,
      motherId: true,
    },
  });

  const unions = await prisma.union.findMany({
    where: { treeId: activeTreeId },
    select: {
      id: true,
      partner1Id: true,
      partner2Id: true,
      weddingDate: true,
      weddingPlace: true,
    },
  });

  return (
    <div style={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      <InteractiveTreeClient people={people} unions={unions} />
    </div>
  );
}

