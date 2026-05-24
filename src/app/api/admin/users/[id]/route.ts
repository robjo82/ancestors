import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser) {
      return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    }
    if (!isAdmin(adminUser.email)) {
      return NextResponse.json({ error: "Accès interdit. Réservé aux administrateurs." }, { status: 403 });
    }

    const { id } = await params;

    // Prevent administrators from self-deleting their active session account
    if (id === adminUser.id) {
      return NextResponse.json({ error: "Action non autorisée. Vous ne pouvez pas supprimer votre propre compte administrateur actif." }, { status: 400 });
    }

    // Verify user exists
    const userToDelete = await prisma.user.findUnique({
      where: { id }
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "Utilisateur non trouvé." }, { status: 404 });
    }

    // Perform cascade delete (automatically handled by Prisma/SQLite constraints onDelete: Cascade)
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Le compte utilisateur a été supprimé avec succès." });
  } catch (e: any) {
    console.error("Admin delete user account error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la suppression du compte." }, { status: 500 });
  }
}
