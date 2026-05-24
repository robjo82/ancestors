import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "L'adresse email est requise." }, { status: 400 });
    }

    const targetEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: targetEmail }
    });

    // For security, even if the user doesn't exist, we return a success status
    // to prevent email enumeration attacks.
    if (!user) {
      return NextResponse.json({ success: true, message: "Si un compte correspond à cette adresse, un email de réinitialisation y a été envoyé." });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    // Save token to database (delete any existing tokens for this user first to keep it clean)
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt
      }
    });

    // Simulate sending email by logging the reset link to logs
    const origin = request.headers.get("origin") || "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${token}`;

    console.log(`\n======================================================`);
    console.log(`[PASSWORD RESET EMAIL]`);
    console.log(`Destinataire: ${targetEmail}`);
    console.log(`Lien de réinitialisation: ${resetUrl}`);
    console.log(`Expire le: ${expiresAt.toLocaleString("fr-FR")}`);
    console.log(`======================================================\n`);

    return NextResponse.json({
      success: true,
      message: "Si un compte correspond à cette adresse, un email de réinitialisation y a été envoyé."
    });
  } catch (e: any) {
    console.error("Forgot password API error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la demande." }, { status: 500 });
  }
}
