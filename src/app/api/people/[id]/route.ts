import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getCurrentUser, getActiveTreeIdForUser } from "../../../../lib/auth";
import { checkPersonConsistency } from "../../../../utils/consistency";

// GET /api/people/[id] - Récupère les détails d'un individu avec toutes ses relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const activeTreeId = await getActiveTreeIdForUser(user.id);
    const { id } = await params;
    
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
      return NextResponse.json(
        { error: "Individu introuvable." },
        { status: 404 }
      );
    }
    
    // Récupérer les enfants (où la personne est le père ou la mère)
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
    
    // Structurer la réponse pour faciliter la consommation côté frontend
    const unions = [
      ...person.unionsPartner1.map((u: any) => ({
        id: u.id,
        type: u.type,
        weddingDate: u.weddingDate,
        weddingPlace: u.weddingPlace,
        divorceDate: u.divorceDate,
        isDivorced: u.isDivorced,
        notes: u.notes,
        partner: u.partner2, // C'est le conjoint
      })),
      ...person.unionsPartner2.map((u: any) => ({
        id: u.id,
        type: u.type,
        weddingDate: u.weddingDate,
        weddingPlace: u.weddingPlace,
        divorceDate: u.divorceDate,
        isDivorced: u.isDivorced,
        notes: u.notes,
        partner: u.partner1, // C'est le conjoint
      })),
    ];
    
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

    return NextResponse.json({
      ...person,
      unions,
      children,
      consistencyWarnings,
    });
  } catch (error: any) {
    console.error("Erreur lors de la récupération de la personne:", error);
    return NextResponse.json(
      { error: "Impossible de récupérer les détails de la personne." },
      { status: 500 }
    );
  }
}

// PUT /api/people/[id] - Modifie les informations d'un individu
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const activeTreeId = await getActiveTreeIdForUser(user.id);
    const { id } = await params;
    
    // Verify first that this person exists and belongs to the activeTreeId
    const existing = await prisma.person.findFirst({
      where: { id, treeId: activeTreeId }
    });
    if (!existing) {
      return NextResponse.json({ error: "Individu introuvable." }, { status: 404 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      birthName,
      gender,
      birthDate,
      birthPlace,
      baptismDate,
      baptismPlace,
      deathDate,
      deathPlace,
      burialDate,
      burialPlace,
      occupation,
      notes,
      avatarUrl,
      sources,
      fatherId,
      motherId,
    } = body;
    
    // Vérification de cycles (un individu ne peut pas être son propre parent, grand-parent, etc.)
    if (fatherId === id || motherId === id) {
      return NextResponse.json(
        { error: "Un individu ne peut pas être son propre parent." },
        { status: 400 }
      );
    }
    
    const updatedPerson = await prisma.person.update({
      where: { id },
      data: {
        firstName,
        lastName,
        birthName: birthName !== undefined ? birthName : undefined,
        gender,
        birthDate: birthDate !== undefined ? birthDate : undefined,
        birthPlace: birthPlace !== undefined ? birthPlace : undefined,
        baptismDate: baptismDate !== undefined ? baptismDate : undefined,
        baptismPlace: baptismPlace !== undefined ? baptismPlace : undefined,
        deathDate: deathDate !== undefined ? deathDate : undefined,
        deathPlace: deathPlace !== undefined ? deathPlace : undefined,
        burialDate: burialDate !== undefined ? burialDate : undefined,
        burialPlace: burialPlace !== undefined ? burialPlace : undefined,
        occupation: occupation !== undefined ? occupation : undefined,
        notes: notes !== undefined ? notes : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        sources: sources !== undefined ? sources : undefined,
        fatherId: fatherId !== undefined ? fatherId : undefined,
        motherId: motherId !== undefined ? motherId : undefined,
      },
    });
    
    return NextResponse.json(updatedPerson);
  } catch (error: any) {
    console.error("Erreur lors de la modification de la personne:", error);
    return NextResponse.json(
      { error: "Impossible de modifier la personne." },
      { status: 500 }
    );
  }
}

// DELETE /api/people/[id] - Supprime un individu
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const activeTreeId = await getActiveTreeIdForUser(user.id);
    const { id } = await params;
    
    // Verify first that this person exists and belongs to the activeTreeId
    const existing = await prisma.person.findFirst({
      where: { id, treeId: activeTreeId }
    });
    if (!existing) {
      return NextResponse.json({ error: "Individu introuvable." }, { status: 404 });
    }
    
    // Supprimer la personne (Prisma gérera la suppression en cascade sur les unions et médias si configuré)
    await prisma.person.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erreur lors de la suppression de la personne:", error);
    return NextResponse.json(
      { error: "Impossible de supprimer la personne." },
      { status: 500 }
    );
  }
}

