import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getCurrentUser, getActiveTreeIdForUser } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const activeTreeId = await getActiveTreeIdForUser(user.id);
    if (!activeTreeId) {
      return NextResponse.json({ error: "Aucun arbre actif sélectionné." }, { status: 400 });
    }

    const body = await request.json();
    const { keepId, deleteId, mergedFields } = body;

    if (!keepId || !deleteId || !mergedFields) {
      return NextResponse.json(
        { error: "Les identifiants keepId, deleteId et les champs mergedFields sont obligatoires." },
        { status: 400 }
      );
    }

    // Récupérer les deux profils à fusionner pour vérification de sécurité
    const keepPerson = await prisma.person.findUnique({
      where: { id: keepId },
    });
    const deletePerson = await prisma.person.findUnique({
      where: { id: deleteId },
    });

    if (!keepPerson || !deletePerson) {
      return NextResponse.json({ error: "L'un des profils est introuvable." }, { status: 404 });
    }

    if (keepPerson.treeId !== activeTreeId || deletePerson.treeId !== activeTreeId) {
      return NextResponse.json({ error: "Action non autorisée sur cet arbre." }, { status: 403 });
    }

    // Exécuter la fusion dans une transaction Prisma sécurisée
    await prisma.$transaction(async (tx) => {
      // 1. Éviter les cycles de parenté avec soi-même
      let cleanFatherId = mergedFields.fatherId !== undefined ? mergedFields.fatherId : keepPerson.fatherId;
      let cleanMotherId = mergedFields.motherId !== undefined ? mergedFields.motherId : keepPerson.motherId;

      if (cleanFatherId === deleteId) {
        cleanFatherId = null;
      }
      if (cleanMotherId === deleteId) {
        cleanMotherId = null;
      }

      // 2. Mettre à jour la personne qu'on garde avec les champs fusionnés
      await tx.person.update({
        where: { id: keepId },
        data: {
          firstName: mergedFields.firstName ?? keepPerson.firstName,
          lastName: mergedFields.lastName ?? keepPerson.lastName,
          birthName: mergedFields.birthName !== undefined ? mergedFields.birthName : keepPerson.birthName,
          gender: mergedFields.gender ?? keepPerson.gender,
          birthDate: mergedFields.birthDate !== undefined ? mergedFields.birthDate : keepPerson.birthDate,
          birthPlace: mergedFields.birthPlace !== undefined ? mergedFields.birthPlace : keepPerson.birthPlace,
          baptismDate: mergedFields.baptismDate !== undefined ? mergedFields.baptismDate : keepPerson.baptismDate,
          baptismPlace: mergedFields.baptismPlace !== undefined ? mergedFields.baptismPlace : keepPerson.baptismPlace,
          deathDate: mergedFields.deathDate !== undefined ? mergedFields.deathDate : keepPerson.deathDate,
          deathPlace: mergedFields.deathPlace !== undefined ? mergedFields.deathPlace : keepPerson.deathPlace,
          burialDate: mergedFields.burialDate !== undefined ? mergedFields.burialDate : keepPerson.burialDate,
          burialPlace: mergedFields.burialPlace !== undefined ? mergedFields.burialPlace : keepPerson.burialPlace,
          occupation: mergedFields.occupation !== undefined ? mergedFields.occupation : keepPerson.occupation,
          notes: mergedFields.notes !== undefined ? mergedFields.notes : keepPerson.notes,
          sources: mergedFields.sources !== undefined ? mergedFields.sources : keepPerson.sources,
          avatarUrl: mergedFields.avatarUrl !== undefined ? mergedFields.avatarUrl : keepPerson.avatarUrl,
          fatherId: cleanFatherId,
          motherId: cleanMotherId,
        },
      });

      // 3. Rediriger les enfants dont deleteId était le père
      await tx.person.updateMany({
        where: { fatherId: deleteId },
        data: { fatherId: keepId },
      });

      // 4. Rediriger les enfants dont deleteId était la mère
      await tx.person.updateMany({
        where: { motherId: deleteId },
        data: { motherId: keepId },
      });

      // 5. Récupérer et mettre à jour les unions
      const deleteUnions = await tx.union.findMany({
        where: {
          OR: [{ partner1Id: deleteId }, { partner2Id: deleteId }],
        },
      });

      const keepUnions = await tx.union.findMany({
        where: {
          OR: [{ partner1Id: keepId }, { partner2Id: keepId }],
        },
      });

      for (const du of deleteUnions) {
        const otherPartnerId = du.partner1Id === deleteId ? du.partner2Id : du.partner1Id;

        // Chercher s'il y a déjà une union identique pour keepId
        const duplicateUnion = keepUnions.find(
          (ku) =>
            (ku.partner1Id === keepId && ku.partner2Id === otherPartnerId) ||
            (ku.partner2Id === keepId && ku.partner1Id === otherPartnerId)
        );

        if (duplicateUnion) {
          // Fusionner les informations de l'union
          const mergedNotes = [duplicateUnion.notes, du.notes].filter(Boolean).join(" | ");
          await tx.union.update({
            where: { id: duplicateUnion.id },
            data: {
              weddingDate: duplicateUnion.weddingDate || du.weddingDate,
              weddingPlace: duplicateUnion.weddingPlace || du.weddingPlace,
              notes: mergedNotes || null,
            },
          });

          // Supprimer l'ancienne union doublonnée
          await tx.union.delete({
            where: { id: du.id },
          });
        } else {
          // Mettre à jour l'union pour pointer vers le profil conservé
          if (du.partner1Id === deleteId) {
            await tx.union.update({
              where: { id: du.id },
              data: { partner1Id: keepId },
            });
          } else {
            await tx.union.update({
              where: { id: du.id },
              data: { partner2Id: keepId },
            });
          }
        }
      }

      // 6. Rediriger tous les médias liés au profil supprimé
      await tx.media.updateMany({
        where: { personId: deleteId },
        data: { personId: keepId },
      });

      // 7. Supprimer définitivement le profil en doublon
      await tx.person.delete({
        where: { id: deleteId },
      });
    });

    return NextResponse.json({ success: true, keepId });
  } catch (error: any) {
    console.error("Erreur lors de la fusion des profils:", error);
    return NextResponse.json(
      { error: "Impossible de procéder à la fusion des deux profils." },
      { status: 500 }
    );
  }
}
