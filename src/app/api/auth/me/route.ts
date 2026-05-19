import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }

    const trees = await prisma.tree.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true, description: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      user,
      trees,
    });
  } catch (e: any) {
    console.error("Auth me error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la récupération de la session." }, { status: 500 });
  }
}
