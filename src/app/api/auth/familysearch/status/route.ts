import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ connected: false, error: "Non autorisé" });
    }

    const connection = await prisma.familySearchConnection.findUnique({
      where: { userId: user.id }
    });

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    // Vérifier si le jeton est expiré
    if (new Date() > connection.expiresAt) {
      // Facultatif : on supprime la connexion expirée pour nettoyer la base
      try {
        await prisma.familySearchConnection.delete({
          where: { userId: user.id }
        });
      } catch (e) {}
      return NextResponse.json({ connected: false, expired: true });
    }

    return NextResponse.json({
      connected: true,
      fsContactName: connection.fsContactName,
      fsUsername: connection.fsUsername,
      fsUserId: connection.fsUserId,
    });
  } catch (error: any) {
    console.error("Erreur lors de la vérification du statut FamilySearch:", error);
    return NextResponse.json({ connected: false });
  }
}
