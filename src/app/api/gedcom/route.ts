import { NextRequest, NextResponse } from "next/server";
import { parseGedcom } from "../../../utils/gedcomParser";
import { exportGedcom } from "../../../utils/gedcomExporter";
import { getCurrentUser, getActiveTreeIdForUser } from "../../../lib/auth";

// GET /api/gedcom - Exporte les données SQLite au format GEDCOM
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const activeTreeId = await getActiveTreeIdForUser(user.id);
    const gedcomContent = await exportGedcom(activeTreeId);
    
    // Définir les headers pour un téléchargement propre
    return new NextResponse(gedcomContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ancestors_export.ged"',
      },
    });
  } catch (error: any) {
    console.error("Erreur lors de l'exportation GEDCOM:", error);
    return NextResponse.json(
      { error: "Impossible de générer l'exportation GEDCOM." },
      { status: 500 }
    );
  }
}

// POST /api/gedcom - Importe un fichier GEDCOM
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const activeTreeId = await getActiveTreeIdForUser(user.id);
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier n'a été fourni." },
        { status: 400 }
      );
    }
    
    // Lire le contenu du fichier texte
    const fileContent = await file.text();
    
    // Parser et importer
    const result = await parseGedcom(fileContent, activeTreeId);
    
    return NextResponse.json({
      success: true,
      message: "Fichier GEDCOM importé avec succès !",
      peopleCount: result.peopleCount,
      unionsCount: result.unionsCount,
    });
  } catch (error: any) {
    console.error("Erreur lors de l'importation GEDCOM:", error);
    return NextResponse.json(
      { error: "Impossible d'importer le fichier GEDCOM. Assurez-vous qu'il s'agit d'un fichier GEDCOM valide au format UTF-8 ou ASCII." },
      { status: 500 }
    );
  }
}

