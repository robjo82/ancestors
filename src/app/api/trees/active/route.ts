import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const { treeId } = await request.json();
    if (!treeId) {
      return NextResponse.json({ error: "L'identifiant de l'arbre est requis." }, { status: 400 });
    }

    // Verify tree ownership
    const tree = await prisma.tree.findUnique({ where: { id: treeId } });
    if (!tree || tree.ownerId !== user.id) {
      return NextResponse.json({ error: "Arbre non trouvé ou non autorisé." }, { status: 404 });
    }

    const cookieStore = await cookies();
    cookieStore.set("activeTreeId", treeId, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 1 week
      path: "/",
    });

    return NextResponse.json({ message: "Arbre actif mis à jour.", treeId });
  } catch (e: any) {
    console.error("Set active tree error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors du changement d'arbre." }, { status: 500 });
  }
}
