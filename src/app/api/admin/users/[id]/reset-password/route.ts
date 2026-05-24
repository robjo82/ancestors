import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
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
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit faire au moins 6 caractères." }, { status: 400 });
    }

    // Verify user exists
    const userToUpdate = await prisma.user.findUnique({
      where: { id }
    });

    if (!userToUpdate) {
      return NextResponse.json({ error: "Utilisateur non trouvé." }, { status: 404 });
    }

    // Hash and update the password
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash: hashPassword(newPassword)
      }
    });

    return NextResponse.json({ success: true, message: "Le mot de passe de l'utilisateur a été réinitialisé avec succès." });
  } catch (e: any) {
    console.error("Admin reset password error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la réinitialisation du mot de passe." }, { status: 500 });
  }
}
