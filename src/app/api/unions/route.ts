import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

// POST /api/unions - Crée une nouvelle union
export async function POST(request: NextRequest) {
  try {
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
    
    // Vérifier si une union existe déjà entre ces deux personnes
    const existingUnion = await prisma.union.findFirst({
      where: {
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
