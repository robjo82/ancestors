import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "L'email et le mot de passe sont requis." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit faire au moins 6 caractères." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Un utilisateur avec cet email existe déjà." }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    // Use a transaction to create the user, their default tree, and migrate orphaned data
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: name || null,
        },
      });

      const tree = await tx.tree.create({
        data: {
          name: "Mon arbre généalogique",
          description: "Mon premier arbre généalogique sur Ancestors",
          ownerId: user.id,
        },
      });

      // Migrate any orphaned local database records (where treeId is null) to this default tree
      const migratedPeople = await tx.person.updateMany({
        where: { treeId: null },
        data: { treeId: tree.id },
      });

      const migratedUnions = await tx.union.updateMany({
        where: { treeId: null },
        data: { treeId: tree.id },
      });

      const migratedMedia = await tx.media.updateMany({
        where: { treeId: null },
        data: { treeId: tree.id },
      });

      return { user, tree, migrations: { people: migratedPeople.count, unions: migratedUnions.count, media: migratedMedia.count } };
    });

    const token = signToken({ userId: result.user.id });

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 1 week
      path: "/",
    });

    // Save the default tree ID in cookies to scope the API requests
    cookieStore.set("activeTreeId", result.tree.id, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 1 week
      path: "/",
    });

    return NextResponse.json({
      message: "Inscription réussie.",
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
      tree: { id: result.tree.id, name: result.tree.name },
      migratedCount: result.migrations,
    });
  } catch (e: any) {
    console.error("Signup error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de l'inscription." }, { status: 500 });
  }
}
