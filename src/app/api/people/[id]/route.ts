import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

// GET /api/people/[id] - Récupère les détails d'un individu avec toutes ses relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
      return NextResponse.json(
        { error: "Individu introuvable." },
        { status: 404 }
      );
    }
    
    // Récupérer les enfants (où la personne est le père ou la mère)
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
    
    return NextResponse.json({
      ...person,
      unions,
      children,
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
    const { id } = await params;
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
    const { id } = await params;
    
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
