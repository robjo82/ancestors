import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// POST /api/upload - Téléverse un média (photo ou document) pour un individu
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const personId = formData.get("personId") as string;
    const title = formData.get("title") as string || "Fichier importé";
    const type = formData.get("type") as string || "PHOTO"; // "PHOTO", "DOCUMENT", "OTHER"
    const description = formData.get("description") as string || "";
    const date = formData.get("date") as string || "";
    const setAvatar = formData.get("setAvatar") === "true";
    
    if (!file || !personId) {
      return NextResponse.json(
        { error: "Le fichier et l'ID de l'individu sont obligatoires." },
        { status: 400 }
      );
    }
    
    // Vérifier que la personne existe
    const person = await prisma.person.findUnique({
      where: { id: personId },
    });
    
    if (!person) {
      return NextResponse.json(
        { error: "L'individu associé est introuvable." },
        { status: 404 }
      );
    }
    
    // Créer le dossier public/uploads s'il n'existe pas
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    
    // Générer un nom de fichier unique
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${uniqueSuffix}_${sanitizedFilename}`;
    const filePath = join(uploadDir, filename);
    
    // Lire le buffer du fichier et l'écrire sur le disque
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    
    const relativeUrl = `/uploads/${filename}`;
    
    // Enregistrer le média en base de données
    const media = await prisma.media.create({
      data: {
        personId,
        url: relativeUrl,
        title,
        type,
        description: description || null,
        date: date || null,
      },
    });
    
    // Si demandé, définir comme photo de profil principale
    if (setAvatar) {
      await prisma.person.update({
        where: { id: personId },
        data: {
          avatarUrl: relativeUrl,
        },
      });
    }
    
    return NextResponse.json(media, { status: 201 });
  } catch (error: any) {
    console.error("Erreur lors du téléversement du média:", error);
    return NextResponse.json(
      { error: "Impossible d'importer le fichier multimédia." },
      { status: 500 }
    );
  }
}
