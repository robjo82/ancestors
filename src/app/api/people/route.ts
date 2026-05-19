import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { getCurrentUser, getActiveTreeIdForUser } from "../../../lib/auth";

// GET /api/people - Liste les individus avec possibilité de recherche
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const activeTreeId = await getActiveTreeIdForUser(user.id);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    
    let people;
    
    if (query) {
      people = await prisma.person.findMany({
        where: {
          treeId: activeTreeId,
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { birthName: { contains: query } },
            { occupation: { contains: query } },
            { birthPlace: { contains: query } },
          ],
        },
        orderBy: [
          { lastName: "asc" },
          { firstName: "asc" },
        ],
      });
    } else {
      people = await prisma.person.findMany({
        where: {
          treeId: activeTreeId,
        },
        orderBy: [
          { lastName: "asc" },
          { firstName: "asc" },
        ],
      });
    }
    
    return NextResponse.json(people);
  } catch (error: any) {
    console.error("Erreur lors de la récupération des personnes:", error);
    return NextResponse.json(
      { error: "Impossible de récupérer la liste des personnes." },
      { status: 500 }
    );
  }
}

// POST /api/people - Crée un nouvel individu
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const activeTreeId = await getActiveTreeIdForUser(user.id);
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
    
    if (!firstName || !lastName || !gender) {
      return NextResponse.json(
        { error: "Le prénom, le nom de famille et le sexe sont obligatoires." },
        { status: 400 }
      );
    }
    
    const person = await prisma.person.create({
      data: {
        treeId: activeTreeId,
        firstName,
        lastName,
        birthName: birthName || null,
        gender,
        birthDate: birthDate || null,
        birthPlace: birthPlace || null,
        baptismDate: baptismDate || null,
        baptismPlace: baptismPlace || null,
        deathDate: deathDate || null,
        deathPlace: deathPlace || null,
        burialDate: burialDate || null,
        burialPlace: burialPlace || null,
        occupation: occupation || null,
        notes: notes || null,
        avatarUrl: avatarUrl || null,
        sources: sources || null,
        fatherId: fatherId || null,
        motherId: motherId || null,
      },
    });
    
    return NextResponse.json(person, { status: 201 });
  } catch (error: any) {
    console.error("Erreur lors de la création de la personne:", error);
    return NextResponse.json(
      { error: "Impossible de créer l'individu." },
      { status: 500 }
    );
  }
}

