import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { getCurrentUser, getActiveTreeIdForUser } from "../../../lib/auth";

// POST /api/unions - Crée une nouvelle union
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const activeTreeId = await getActiveTreeIdForUser(user.id);
    const body = await request.json();
    const {
      partner1Id,
      partner2Id,
      type,
      weddingDate,
      weddingPlace,
      divorceDate,
      isDivorced,
      notes,
    } = body;
    
    if (!partner1Id || !partner2Id) {
      return NextResponse.json(
        { error: "Les deux conjoints sont obligatoires." },
        { status: 400 }
      );
    }

    // Vérifier que les deux partenaires appartiennent à l'arbre actif de l'utilisateur
    const partnerCount = await prisma.person.count({
      where: {
        id: { in: [partner1Id, partner2Id] },
        treeId: activeTreeId,
      },
    });

    if (partnerCount !== 2) {
      return NextResponse.json(
        { error: "Les conjoints doivent appartenir à votre arbre actif." },
        { status: 400 }
      );
    }
    
    // Vérifier si une union existe déjà entre ces deux personnes
    const existingUnion = await prisma.union.findFirst({
      where: {
        treeId: activeTreeId,
        OR: [
          { partner1Id, partner2Id },
          { partner1Id: partner2Id, partner2Id: partner1Id },
        ],
      },
    });
    
    if (existingUnion) {
      return NextResponse.json(
        { error: "Une union existe déjà entre ces deux personnes." },
        { status: 400 }
      );
    }
    
    const union = await prisma.union.create({
      data: {
        treeId: activeTreeId,
        partner1Id,
        partner2Id,
        type: type || "MARRIAGE",
        weddingDate: weddingDate || null,
        weddingPlace: weddingPlace || null,
        divorceDate: divorceDate || null,
        isDivorced: !!isDivorced,
        notes: notes || null,
      },
    });
    
    return NextResponse.json(union, { status: 201 });
  } catch (error: any) {
    console.error("Erreur lors de la création de l'union:", error);
    return NextResponse.json(
      { error: "Impossible de créer l'union." },
      { status: 500 }
    );
  }
}

