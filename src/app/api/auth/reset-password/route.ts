import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Le jeton de réinitialisation est absent ou invalide." }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit faire au moins 6 caractères." }, { status: 400 });
    }

    // Hash token to query from db
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Le lien de réinitialisation est invalide ou a déjà été utilisé." }, { status: 400 });
    }

    // Verify expiration
    if (new Date() > resetToken.expiresAt) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      });
      return NextResponse.json({ error: "Le lien de réinitialisation a expiré." }, { status: 400 });
    }

    // Update user's password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash: hashPassword(newPassword)
      }
    });

    // Delete token after successful use
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    });

    return NextResponse.json({
      success: true,
      message: "Votre mot de passe a été modifié avec succès."
    });
  } catch (e: any) {
    console.error("Reset password API error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors du changement de mot de passe." }, { status: 500 });
  }
}
