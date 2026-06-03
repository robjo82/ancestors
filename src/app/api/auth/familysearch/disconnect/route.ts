import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    // Supprimer la connexion de la base de données
    try {
      await prisma.familySearchConnection.delete({
        where: { userId: user.id }
      });
    } catch (dbError) {
      // Ignorer si la connexion n'existait pas déjà en base
    }

    const cookieStore = await cookies();
    cookieStore.delete("fs_access_token");
    
    return NextResponse.json({ success: true, message: "Déconnecté de FamilySearch avec succès." });
  } catch (error: any) {
    console.error("Erreur lors de la déconnexion de FamilySearch:", error);
    return NextResponse.json(
      { error: "Impossible de se déconnecter de FamilySearch." },
      { status: 500 }
    );
  }
}
