import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    // 1. Calculate global statistics across the entire SQLite database
    const totalUsers = await prisma.user.count();
    const totalTrees = await prisma.tree.count();
    const totalPeople = await prisma.person.count();
    const totalSuggestions = await prisma.featureRequest.count();

    // 2. Fetch list of users with details
    const dbUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        emailAnniversaries: true,
        emailNameDays: true,
        trees: {
          select: {
            id: true,
            name: true,
            _count: {
              select: { people: true }
            }
          }
        }
      }
    });

    // 3. Format the users list to include calculated stats per user
    const users = dbUsers.map(user => {
      const treeCount = user.trees.length;
      const peopleCount = user.trees.reduce((sum, tree) => sum + tree._count.people, 0);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        emailAnniversaries: user.emailAnniversaries,
        emailNameDays: user.emailNameDays,
        treeCount,
        peopleCount
      };
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalTrees,
        totalPeople,
        totalSuggestions
      },
      users
    });
  } catch (e: any) {
    console.error("Fetch admin users list error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la récupération des données d'administration." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "L'adresse email et le mot de passe sont requis." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit faire au moins 6 caractères." }, { status: 400 });
    }

    const targetEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: targetEmail }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Un utilisateur avec cette adresse email existe déjà." }, { status: 400 });
    }

    // Create user with hashed password
    const user = await prisma.user.create({
      data: {
        name: name ? name.trim() : null,
        email: targetEmail,
        passwordHash: hashPassword(password),
        emailAnniversaries: false,
        emailNameDays: false
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (e: any) {
    console.error("Admin create user account error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la création du compte." }, { status: 500 });
  }
}
