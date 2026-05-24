import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    }
    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: "Accès interdit. Réservé aux administrateurs." }, { status: 403 });
    }

    const features = await prisma.featureRequest.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(features);
  } catch (e: any) {
    console.error("Fetch feature requests error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la récupération des suggestions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const { title, description, category } = await request.json();

    if (!title || !description) {
      return NextResponse.json({ error: "Le titre et la description sont requis." }, { status: 400 });
    }

    const feature = await prisma.featureRequest.create({
      data: {
        title,
        description,
        category: category || "other",
        status: "PENDING",
        userEmail: user.email,
      },
    });

    return NextResponse.json(feature);
  } catch (e: any) {
    console.error("Create feature request error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la création de la suggestion." }, { status: 500 });
  }
}
