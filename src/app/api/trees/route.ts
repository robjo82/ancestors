import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const trees = await prisma.tree.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { people: true, unions: true, media: true }
        }
      }
    });

    return NextResponse.json(trees);
  } catch (e: any) {
    console.error("Fetch trees error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la récupération des arbres." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const { name, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Le nom de l'arbre est requis." }, { status: 400 });
    }

    const tree = await prisma.tree.create({
      data: {
        name,
        description: description || null,
        ownerId: user.id,
      },
    });

    // Set the new tree as the active one in cookies
    const cookieStore = await cookies();
    cookieStore.set("activeTreeId", tree.id, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 1 week
      path: "/",
    });

    return NextResponse.json(tree);
  } catch (e: any) {
    console.error("Create tree error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la création de l'arbre." }, { status: 500 });
  }
}
