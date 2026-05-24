import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";
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

    const origin = request.headers.get("origin") || "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // Dispatch the password reset email using the new sendMail helper
    await sendMail({
      to: targetEmail,
      subject: "Réinitialisation de votre mot de passe - Ancestors",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0c1a13; color: #e2e8f0; padding: 40px 20px; text-align: center; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1c3d2e;">
          <h1 style="color: #fbbf24; font-size: 28px; font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 8px;">🌳 Ancestors</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1; margin-bottom: 30px; text-align: left;">
            Bonjour,<br><br>
            Vous avez demandé la réinitialisation de votre mot de passe pour votre compte <strong>Ancestors</strong>. Veuillez cliquer sur le bouton ci-dessous pour définir un nouveau mot de passe.
          </p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 30px; font-size: 16px; font-weight: bold; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: background-color 0.2s;">Réinitialiser mon mot de passe</a>
          </div>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 40px; text-align: left;">
            Ce lien expirera le <strong>${expiresAt.toLocaleString("fr-FR")}</strong>.<br>
            Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
          </p>
          <hr style="border: none; border-top: 1px solid #1c3d2e; margin: 30px 0;">
          <p style="font-size: 11px; color: #64748b; margin: 0;">
            &copy; ${new Date().getFullYear()} Ancestors. Votre histoire familiale, réinventée.
          </p>
        </div>
      `
    });

    return NextResponse.json({
      success: true,
      message: "Si un compte correspond à cette adresse, un email de réinitialisation y a été envoyé."
    });
  } catch (e: any) {
    console.error("Forgot password API error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la demande." }, { status: 500 });
  }
}
