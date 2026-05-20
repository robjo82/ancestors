import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.FAMILYSEARCH_CLIENT_ID;
    
    if (!clientId) {
      return NextResponse.json(
        { error: "FamilySearch Client ID non configuré dans les variables d'environnement." },
        { status: 500 }
      );
    }

    const fsEnv = process.env.FAMILYSEARCH_ENV || "sandbox";
    const authBaseUrl = fsEnv === "production"
      ? "https://ident.familysearch.org/cis-web/oauth2/v3/authorization"
      : "https://identbeta.familysearch.org/cis-web/oauth2/v3/authorization";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl}/api/auth/familysearch/callback`;

    // Générer un state cryptographique contre les attaques CSRF
    const state = crypto.randomBytes(16).toString("hex");

    const cookieStore = await cookies();
    cookieStore.set("fs_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const authUrl = `${authBaseUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Erreur lors de l'initialisation de l'authentification FamilySearch:", error);
    return NextResponse.json(
      { error: "Impossible d'initier la connexion avec FamilySearch." },
      { status: 500 }
    );
  }
}
