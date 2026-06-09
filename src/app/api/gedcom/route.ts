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

function decodeAnsel(buffer: Buffer): string {
  let result = "";
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    
    // Diacritiques combinés non-espacés d'ANSEL (0xE0 à 0xFE)
    if (byte >= 0xE0 && byte <= 0xFE) {
      if (i + 1 < buffer.length) {
        const nextByte = buffer[i + 1];
        const baseChar = String.fromCharCode(nextByte);
        i++; // sauter le caractère de base déjà consommé
        
        if (byte === 0xE1) { // grave
          if (baseChar === "a") result += "à";
          else if (baseChar === "e") result += "è";
          else if (baseChar === "i") result += "ì";
          else if (baseChar === "o") result += "ò";
          else if (baseChar === "u") result += "ù";
          else if (baseChar === "A") result += "À";
          else if (baseChar === "E") result += "È";
          else if (baseChar === "I") result += "Ì";
          else if (baseChar === "O") result += "Ò";
          else if (baseChar === "U") result += "Ù";
          else result += baseChar + "\u0300";
        } else if (byte === 0xE2) { // aigu
          if (baseChar === "a") result += "á";
          else if (baseChar === "e") result += "é";
          else if (baseChar === "i") result += "í";
          else if (baseChar === "o") result += "ó";
          else if (baseChar === "u") result += "ú";
          else if (baseChar === "y") result += "ý";
          else if (baseChar === "A") result += "Á";
          else if (baseChar === "E") result += "É";
          else if (baseChar === "I") result += "Í";
          else if (baseChar === "O") result += "Ó";
          else if (baseChar === "U") result += "Ú";
          else if (baseChar === "Y") result += "Ý";
          else if (baseChar === "c") result += "ć";
          else if (baseChar === "C") result += "Ć";
          else result += baseChar + "\u0301";
        } else if (byte === 0xE3) { // circonflexe
          if (baseChar === "a") result += "â";
          else if (baseChar === "e") result += "ê";
          else if (baseChar === "i") result += "î";
          else if (baseChar === "o") result += "ô";
          else if (baseChar === "u") result += "û";
          else if (baseChar === "A") result += "Â";
          else if (baseChar === "E") result += "Ê";
          else if (baseChar === "I") result += "Î";
          else if (baseChar === "O") result += "Ô";
          else if (baseChar === "U") result += "Û";
          else result += baseChar + "\u0302";
        } else if (byte === 0xE4) { // tilde
          if (baseChar === "a") result += "ã";
          else if (baseChar === "n") result += "ñ";
          else if (baseChar === "o") result += "õ";
          else if (baseChar === "A") result += "Ã";
          else if (baseChar === "N") result += "Ñ";
          else if (baseChar === "O") result += "Õ";
          else result += baseChar + "\u0303";
        } else if (byte === 0xE8) { // tréma
          if (baseChar === "a") result += "ä";
          else if (baseChar === "e") result += "ë";
          else if (baseChar === "i") result += "ï";
          else if (baseChar === "o") result += "ö";
          else if (baseChar === "u") result += "ü";
          else if (baseChar === "y") result += "ÿ";
          else if (baseChar === "A") result += "Ä";
          else if (baseChar === "E") result += "Ë";
          else if (baseChar === "I") result += "Ï";
          else if (baseChar === "O") result += "Ö";
          else if (baseChar === "U") result += "Ü";
          else if (baseChar === "Y") result += "Ÿ";
          else result += baseChar + "\u0308";
        } else if (byte === 0xF0) { // cédille
          if (baseChar === "c") result += "ç";
          else if (baseChar === "C") result += "Ç";
          else result += baseChar + "\u0327";
        } else {
          const combiningOffset = byte - 0xE1;
          if (combiningOffset >= 0) {
            const combiningHex = 0x0300 + combiningOffset;
            result += baseChar + String.fromCharCode(combiningHex);
          } else {
            result += baseChar;
          }
        }
      } else {
        result += " ";
      }
    } 
    // Caractères spéciaux ANSEL
    else if (byte === 0xA5) result += "Æ";
    else if (byte === 0xBD) result += "æ";
    else if (byte === 0xA6) result += "Œ";
    else if (byte === 0xBE) result += "œ";
    else if (byte === 0xC3) result += "©";
    else if (byte === 0xCF) result += "ß";
    else if (byte < 128) {
      result += String.fromCharCode(byte);
    } 
    else {
      // Repli Windows-1252 pour les octets non-ASCII restants
      result += new TextDecoder("windows-1252").decode(Uint8Array.of(byte));
    }
  }
  return result;
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
    
    // Lire le contenu sous forme de buffer binaire
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Détecter l'encodage via l'en-tête (premiers 1000 octets)
    const headerSnippet = buffer.subarray(0, Math.min(1000, buffer.length)).toString("ascii");
    const charMatch = headerSnippet.match(/\r?\n1\s+CHAR\s+(\S+)/i);
    let encoding = "utf-8";
    
    if (charMatch) {
      const detected = charMatch[1].toUpperCase();
      if (detected === "UTF-8" || detected === "UTF8") {
        encoding = "utf-8";
      } else if (detected === "ANSI" || detected === "LATIN1" || detected === "ISO-8859-1" || detected === "WINDOWS-1252" || detected === "IBMPC" || detected === "IBM-850") {
        encoding = "windows-1252";
      } else if (detected === "ANSEL") {
        encoding = "ansel";
      } else if (detected === "ASCII") {
        encoding = "ascii";
      }
    }
    
    let fileContent = "";
    if (encoding === "ansel") {
      fileContent = decodeAnsel(buffer);
    } else {
      const decoder = new TextDecoder(encoding);
      fileContent = decoder.decode(buffer);
    }
    
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

