import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("fs_access_token")?.value;
    
    return NextResponse.json({ connected: !!token });
  } catch (error: any) {
    console.error("Erreur lors de la vérification du statut FamilySearch:", error);
    return NextResponse.json({ connected: false });
  }
}
