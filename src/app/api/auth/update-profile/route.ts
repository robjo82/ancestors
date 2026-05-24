import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const { name, email, currentPassword, newPassword, emailAnniversaries, emailNameDays } = await request.json();

    // Fetch the full user details to check the password and current values
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé." }, { status: 404 });
    }

    const updateData: {
      name?: string | null;
      email?: string;
      passwordHash?: string;
      emailAnniversaries?: boolean;
      emailNameDays?: boolean;
    } = {};

    // 1. Update name if provided
    if (typeof name === "string") {
      updateData.name = name.trim() || null;
    }

    // 2. Update email if provided and different
    if (email && email.trim().toLowerCase() !== dbUser.email.toLowerCase()) {
      const targetEmail = email.trim().toLowerCase();

      // Email update requires password verification for security
      if (!currentPassword) {
        return NextResponse.json({ error: "Le mot de passe actuel est requis pour changer l'adresse email." }, { status: 400 });
      }

      const isPasswordCorrect = verifyPassword(currentPassword, dbUser.passwordHash);
      if (!isPasswordCorrect) {
        return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
      }

      // Check if email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email: targetEmail }
      });
      if (existingUser) {
        return NextResponse.json({ error: "Cet email est déjà utilisé par un autre compte." }, { status: 400 });
      }

      updateData.email = targetEmail;
    }

    // 3. Update password if requested
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Le mot de passe actuel est requis pour définir un nouveau mot de passe." }, { status: 400 });
      }

      const isPasswordCorrect = verifyPassword(currentPassword, dbUser.passwordHash);
      if (!isPasswordCorrect) {
        return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 6 caractères." }, { status: 400 });
      }

      updateData.passwordHash = hashPassword(newPassword);
    }

    // 4. Update notification preferences if provided
    if (typeof emailAnniversaries === "boolean") {
      updateData.emailAnniversaries = emailAnniversaries;
    }
    if (typeof emailNameDays === "boolean") {
      updateData.emailNameDays = emailNameDays;
    }

    // If no changes are needed
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        message: "Aucune modification détectée.",
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          emailAnniversaries: dbUser.emailAnniversaries,
          emailNameDays: dbUser.emailNameDays,
        }
      });
    }

    // Perform update
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        emailAnniversaries: true,
        emailNameDays: true,
      }
    });

    return NextResponse.json({
      message: "Profil mis à jour avec succès.",
      user: updatedUser
    });
  } catch (e: any) {
    console.error("Update profile error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la mise à jour du profil." }, { status: 500 });
  }
}
