import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
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
