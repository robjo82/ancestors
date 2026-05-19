import { prisma } from "../../../lib/db";
import PersonProfileClient from "./PersonProfileClient";
import { notFound } from "next/navigation";

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1. Récupérer le profil complet de l'individu avec ses unions et médias
  const person = await prisma.person.findUnique({
    where: { id },
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
    },
  });

  // Pères et mères possibles pour l'édition de filiation
  const potentialFathers = allPeople.filter((p: any) => p.gender === "M");
  const potentialMothers = allPeople.filter((p: any) => p.gender === "F");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <PersonProfileClient 
        person={person} 
        unions={unions} 
        children={children} 
        allPeople={allPeople}
        potentialFathers={potentialFathers}
        potentialMothers={potentialMothers}
      />
    </div>
  );
}
