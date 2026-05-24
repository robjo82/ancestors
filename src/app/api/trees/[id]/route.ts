import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const { id } = await params;
    const { name, description, userPersonId } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Le nom de l'arbre est requis." }, { status: 400 });
    }

    // Verify tree ownership
    const existingTree = await prisma.tree.findUnique({ where: { id } });
    if (!existingTree || existingTree.ownerId !== user.id) {
      return NextResponse.json({ error: "Arbre non trouvé ou non autorisé." }, { status: 404 });
    }

    const updatedTree = await prisma.tree.update({
      where: { id },
      data: {
        name,
        description: description || null,
        userPersonId: userPersonId || null,
      },
    });

    return NextResponse.json(updatedTree);
  } catch (e: any) {
    console.error("Update tree error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la modification de l'arbre." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const { id } = await params;

    // Verify tree ownership
    const existingTree = await prisma.tree.findUnique({ where: { id } });
    if (!existingTree || existingTree.ownerId !== user.id) {
      return NextResponse.json({ error: "Arbre non trouvé ou non autorisé." }, { status: 404 });
    }

    // Delete the tree
    await prisma.tree.delete({ where: { id } });

    // Handle activeTreeId cookie fallback
    const cookieStore = await cookies();
    const activeTreeId = cookieStore.get("activeTreeId")?.value;

    if (activeTreeId === id) {
      // Find another tree owned by the user
      const remainingTrees = await prisma.tree.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: "asc" },
      });

      if (remainingTrees.length > 0) {
        cookieStore.set("activeTreeId", remainingTrees[0].id, {
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60, // 1 week
          path: "/",
        });
      } else {
        cookieStore.delete("activeTreeId");
      }
    }

    return NextResponse.json({ message: "Arbre supprimé avec succès." });
  } catch (e: any) {
    console.error("Delete tree error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la suppression de l'arbre." }, { status: 500 });
  }
}
