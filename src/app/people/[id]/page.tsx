import { prisma } from "../../../lib/db";
import PersonProfileClient from "./PersonProfileClient";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getActiveTreeIdForUser } from "../../../lib/auth";
import { checkPersonConsistency } from "../../../utils/consistency";

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeTreeId = await getActiveTreeIdForUser(user.id);
  const { id } = await params;

  // 1. Récupérer le profil complet de l'individu avec ses unions et médias
  const person = await prisma.person.findFirst({
    where: { id, treeId: activeTreeId },
    include: {
      father: true,
      mother: true,
      media: {
        orderBy: { createdAt: "desc" },
      },
      unionsPartner1: {
        include: {
          partner2: true,
        },
      },
      unionsPartner2: {
        include: {
          partner1: true,
        },
      },
    },
  });

  if (!person) {
    notFound();
  }

  // Récupérer les enfants
  const children = await prisma.person.findMany({
    where: {
      treeId: activeTreeId,
      OR: [
        { fatherId: id },
        { motherId: id },
      ],
    },
    orderBy: {
      birthDate: "asc",
    },
  });

  // Aplatir les unions pour simplifier l'utilisation
  const unions = [
    ...person.unionsPartner1.map((u: any) => ({
      id: u.id,
      type: u.type,
      weddingDate: u.weddingDate,
      weddingPlace: u.weddingPlace,
      divorceDate: u.divorceDate,
      isDivorced: u.isDivorced,
      notes: u.notes,
      partner: u.partner2,
    })),
    ...person.unionsPartner2.map((u: any) => ({
      id: u.id,
      type: u.type,
      weddingDate: u.weddingDate,
      weddingPlace: u.weddingPlace,
      divorceDate: u.divorceDate,
      isDivorced: u.isDivorced,
      notes: u.notes,
      partner: u.partner1,
    })),
  ];

  // Récupérer la liste complète des individus pour pouvoir associer de nouvelles unions ou parents
  const allPeople = await prisma.person.findMany({
    where: {
      treeId: activeTreeId,
      NOT: { id }, // Exclure l'individu lui-même
    },
    orderBy: [
      { lastName: "asc" },
      { firstName: "asc" },
    ],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gender: true,
      birthDate: true,
      fatherId: true,
      motherId: true,
    },
  });

  // Pères et mères possibles pour l'édition de filiation
  const potentialFathers = allPeople.filter((p: any) => p.gender === "M");
  const potentialMothers = allPeople.filter((p: any) => p.gender === "F");

  // Calculer les avertissements de cohérence
  const unionsForConsistency = unions.map((u: any) => ({
    id: u.id,
    weddingDate: u.weddingDate,
    partnerId: u.partner?.id || "",
    partnerName: u.partner ? `${u.partner.firstName} ${u.partner.lastName}` : "Conjoint inconnu"
  }));

  const childrenForConsistency = children.map((c: any) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    birthDate: c.birthDate
  }));

  const consistencyWarnings = checkPersonConsistency(
    {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      gender: person.gender,
      birthDate: person.birthDate,
      deathDate: person.deathDate,
      fatherId: person.fatherId,
      motherId: person.motherId,
      father: person.father,
      mother: person.mother,
    },
    unionsForConsistency,
    childrenForConsistency
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <PersonProfileClient 
        person={person} 
        unions={unions} 
        children={children} 
        allPeople={allPeople}
        potentialFathers={potentialFathers}
        potentialMothers={potentialMothers}
        consistencyWarnings={consistencyWarnings}
      />
    </div>
  );
}
