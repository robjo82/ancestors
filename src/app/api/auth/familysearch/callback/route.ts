import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const appUrl = `${protocol}://${host}`;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vous devez être connecté pour lier votre compte FamilySearch." },
        { status: 401 }
      );
    }

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

    const clientId = process.env.FAMILYSEARCH_CLIENT_ID || "b007E40M8PNO0BH4T1SD";
    const clientSecret = process.env.FAMILYSEARCH_CLIENT_SECRET;

    const fsEnv = process.env.FAMILYSEARCH_ENV || "sandbox";
    const tokenUrl = fsEnv === "production"
      ? "https://ident.familysearch.org/cis-web/oauth2/v3/token"
      : "https://identbeta.familysearch.org/cis-web/oauth2/v3/token";

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
      return NextResponse.redirect(`${appUrl}/settings?fs_error=token_exchange_failed`);
    }

    const tokenData = await response.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 86400;

    if (!accessToken) {
      console.error("Jeton d'accès non retourné par FamilySearch.");
      return NextResponse.redirect(`${appUrl}/settings?fs_error=missing_access_token`);
    }

    // Récupérer les informations de l'utilisateur sur FamilySearch
    const apiBaseUrl = fsEnv === "production"
      ? "https://api.familysearch.org"
      : "https://apibeta.familysearch.org";

    const userProfileResponse = await fetch(`${apiBaseUrl}/platform/users/current`, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      }
    });

    let fsUserId = "unknown";
    let fsUsername = "unknown";
    let fsContactName = "Utilisateur FamilySearch";

    if (userProfileResponse.ok) {
      const userProfileData = await userProfileResponse.json();
      const fsUser = userProfileData.users?.[0] || {};
      fsUserId = fsUser.id || "unknown";
      fsUsername = fsUser.username || "unknown";
      fsContactName = fsUser.contactName || fsUser.name || "Utilisateur FamilySearch";
    } else {
      console.warn("Impossible de récupérer le profil utilisateur FamilySearch:", await userProfileResponse.text());
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Sauvegarder la connexion en base de données
    await prisma.familySearchConnection.upsert({
      where: { userId: user.id },
      update: {
        accessToken,
        expiresAt,
        fsUserId,
        fsUsername,
        fsContactName,
      },
      create: {
        userId: user.id,
        accessToken,
        expiresAt,
        fsUserId,
        fsUsername,
        fsContactName,
      }
    });

    // Enregistrer le token d'accès dans un cookie sécurisé
    cookieStore.set("fs_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn,
      path: "/",
    });

    return NextResponse.redirect(`${appUrl}/settings?fs_connected=true`);
  } catch (error: any) {
    console.error("Erreur générale dans le callback FamilySearch:", error);
    return NextResponse.redirect(`${appUrl}/settings?fs_error=internal_error`);
  }
}
