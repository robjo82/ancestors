import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    cookieStore.delete("activeTreeId");

    return NextResponse.json({ message: "Déconnexion réussie." });
  } catch (e: any) {
    console.error("Logout error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la déconnexion." }, { status: 500 });
  }
}
