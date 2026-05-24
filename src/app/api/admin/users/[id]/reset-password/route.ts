import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
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
