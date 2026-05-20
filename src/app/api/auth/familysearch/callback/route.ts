import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    const cookieStore = await cookies();
    const savedState = cookieStore.get("fs_oauth_state")?.value;

    // Protection CSRF
    if (!state || !savedState || state !== savedState) {
      return NextResponse.json(
        { error: "Validation CSRF échouée. Requête non autorisée." },
        { status: 400 }
      );
    }

    // Supprimer le cookie de state temporaire
    cookieStore.delete("fs_oauth_state");

    if (!code) {
      return NextResponse.json(
        { error: "Code d'autorisation manquant de FamilySearch." },
        { status: 400 }
      );
    }

    const clientId = process.env.FAMILYSEARCH_CLIENT_ID;
    const clientSecret = process.env.FAMILYSEARCH_CLIENT_SECRET;
    
    if (!clientId) {
      return NextResponse.json(
        { error: "FamilySearch Client ID non configuré." },
        { status: 500 }
      );
    }

    const fsEnv = process.env.FAMILYSEARCH_ENV || "sandbox";
    const tokenUrl = fsEnv === "production"
      ? "https://ident.familysearch.org/cis-web/oauth2/v3/token"
      : "https://identbeta.familysearch.org/cis-web/oauth2/v3/token";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl}/api/auth/familysearch/callback`;

    // Échange du code d'autorisation contre un token d'accès
    const bodyParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
    });

    if (clientSecret) {
      bodyParams.append("client_secret", clientSecret);
    }

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error("Échec de l'échange de token avec FamilySearch:", errData);
      return NextResponse.json(
        { error: "Impossible d'obtenir le jeton d'accès de FamilySearch." },
        { status: response.status }
      );
    }

    const tokenData = await response.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Jeton d'accès non retourné par FamilySearch." },
        { status: 500 }
      );
    }

    // Calculer la durée de vie du cookie (par défaut 24h ou la valeur expiresIn de l'API)
    const maxAge = tokenData.expires_in || 86400;

    // Enregistrer le token d'accès dans un cookie sécurisé
    cookieStore.set("fs_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    // Rediriger vers l'annuaire des personnes avec un indicateur de succès de connexion
    return NextResponse.redirect(`${appUrl}/people?fs_connected=true`);
  } catch (error: any) {
    console.error("Erreur générale dans le callback FamilySearch:", error);
    return NextResponse.json(
      { error: "Une erreur interne s'est produite lors de l'authentification." },
      { status: 500 }
    );
  }
}
