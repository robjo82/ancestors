import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "L'email et le mot de passe sont requis." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 400 });
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 400 });
    }

    // Get the user's trees
    let trees = await prisma.tree.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "asc" },
    });

    // Fallback: If for some reason the user has no trees, create one
    if (trees.length === 0) {
      const defaultTree = await prisma.tree.create({
        data: {
          name: "Mon arbre généalogique",
          description: "Mon premier arbre généalogique sur Ancestors",
          ownerId: user.id,
        },
      });
      trees = [defaultTree];
    }

    const token = signToken({ userId: user.id });

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 1 week
      path: "/",
    });

    // Check if there is already an activeTreeId cookie. If not, set it to the first tree.
    let activeTreeId = cookieStore.get("activeTreeId")?.value;
    const treeExists = activeTreeId ? trees.some(t => t.id === activeTreeId) : false;

    if (!activeTreeId || !treeExists) {
      activeTreeId = trees[0].id;
      cookieStore.set("activeTreeId", activeTreeId, {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 1 week
        path: "/",
      });
    }

    return NextResponse.json({
      message: "Connexion réussie.",
      user: { id: user.id, email: user.email, name: user.name },
      activeTreeId,
    });
  } catch (e: any) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la connexion." }, { status: 500 });
  }
}
