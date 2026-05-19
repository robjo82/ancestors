import { prisma } from "../lib/db";

interface GedcomIndi {
  id: string;
  firstName: string;
  lastName: string;
  birthName?: string;
  gender: string;
  birthDate?: string;
  birthPlace?: string;
  baptismDate?: string;
  baptismPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  burialDate?: string;
  burialPlace?: string;
  occupation?: string;
  notes?: string;
}

interface GedcomFam {
  id: string;
  husbandId?: string;
  wifeId?: string;
  childrenIds: string[];
  weddingDate?: string;
  weddingPlace?: string;
  divorceDate?: string;
  isDivorced: boolean;
  notes?: string;
}

/**
 * Nettoie le nom de famille GEDCOM (ex: "/DUPONT/" -> "DUPONT")
 */
function cleanLastName(rawName: string): string {
  if (!rawName) return "INCONNU";
  return rawName.replace(/\//g, "").trim();
}

/**
 * Sépare un nom complet GEDCOM en prénom et nom (ex: "Jean /DUPONT/" -> ["Jean", "DUPONT"])
 */
function parseGedcomName(fullName: string): [string, string] {
  if (!fullName) return ["Sans nom", "INCONNU"];
  
  const slashIndex1 = fullName.indexOf("/");
  const slashIndex2 = fullName.lastIndexOf("/");
  
  if (slashIndex1 !== -1 && slashIndex2 !== -1 && slashIndex2 > slashIndex1) {
    const firstName = fullName.substring(0, slashIndex1).trim();
    const lastName = cleanLastName(fullName.substring(slashIndex1, slashIndex2 + 1));
    return [firstName || "Sans prénom", lastName || "INCONNU"];
  }
  
  // Si pas de slashes, on prend le dernier mot comme nom de famille
  const parts = fullName.trim().split(/\s+/);
  if (parts.length > 1) {
    const lastName = parts.pop() || "INCONNU";
    const firstName = parts.join(" ");
    return [firstName, lastName];
  }
  
  return [fullName, "INCONNU"];
}

/**
 * Parse le contenu brut d'un fichier GEDCOM et l'enregistre en base de données.
 */
export async function parseGedcom(fileContent: string, treeId: string): Promise<{
  peopleCount: number;
  unionsCount: number;
}> {
  const lines = fileContent.split(/\r?\n/);
  
  const indis: Map<string, GedcomIndi> = new Map();
  const fams: Map<string, GedcomFam> = new Map();
  
  let currentIndi: GedcomIndi | null = null;
  let currentFam: GedcomFam | null = null;
  let currentEvent: string | null = null; // BIRT, DEAT, MARR, BAPM, BURI
  let currentNote: string = "";
  let isNoteActive: boolean = false;
  
  // Première passe : lecture ligne par ligne
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Format : level tag_or_id [value]
    const match = line.match(/^(\d+)\s+(@\w+@|\w+)(?:\s+(.*))?$/);
    if (!match) continue;
    
    const level = parseInt(match[1], 10);
    const part2 = match[2];
    const part3 = match[3] || "";
    
    // Détection d'un nouveau bloc de niveau 0
    if (level === 0) {
      // Sauvegarder les notes en cours sur l'élément actif
      if (isNoteActive) {
        if (currentIndi) currentIndi.notes = currentNote.trim();
        else if (currentFam) currentFam.notes = currentNote.trim();
        isNoteActive = false;
        currentNote = "";
      }
      
      currentEvent = null;
      
      if (part3 === "INDI") {
        currentIndi = {
          id: part2.replace(/@/g, ""),
          firstName: "Sans prénom",
          lastName: "INCONNU",
          gender: "U",
        };
        indis.set(currentIndi.id, currentIndi);
        currentFam = null;
      } else if (part3 === "FAM") {
        currentFam = {
          id: part2.replace(/@/g, ""),
          childrenIds: [],
          isDivorced: false,
        };
        fams.set(currentFam.id, currentFam);
        currentIndi = null;
      } else {
        currentIndi = null;
        currentFam = null;
      }
      continue;
    }
    
    // Traitement pour un Individu (INDI)
    if (currentIndi) {
      if (level === 1) {
        currentEvent = null;
        
        switch (part2) {
          case "NAME":
            const [first, last] = parseGedcomName(part3);
            currentIndi.firstName = first;
            currentIndi.lastName = last;
            break;
          case "_MARN": // Nom de mariage (spécifique à certains exports)
            currentIndi.birthName = currentIndi.lastName;
            break;
          case "SEX":
            currentIndi.gender = part3.toUpperCase().startsWith("M") ? "M" : 
                                 part3.toUpperCase().startsWith("F") ? "F" : "U";
            break;
          case "BIRT":
          case "DEAT":
          case "BAPM":
          case "BURI":
            currentEvent = part2;
            break;
          case "OCCU":
            currentIndi.occupation = part3;
            break;
          case "NOTE":
            isNoteActive = true;
            currentNote = part3 + "\n";
            break;
        }
      } else if (level === 2 && currentEvent) {
        switch (part2) {
          case "DATE":
            if (currentEvent === "BIRT") currentIndi.birthDate = part3;
            else if (currentEvent === "DEAT") currentIndi.deathDate = part3;
            else if (currentEvent === "BAPM") currentIndi.baptismDate = part3;
            else if (currentEvent === "BURI") currentIndi.burialDate = part3;
            break;
          case "PLAC":
            if (currentEvent === "BIRT") currentIndi.birthPlace = part3;
            else if (currentEvent === "DEAT") currentIndi.deathPlace = part3;
            else if (currentEvent === "BAPM") currentIndi.baptismPlace = part3;
            else if (currentEvent === "BURI") currentIndi.burialPlace = part3;
            break;
        }
      } else if (level >= 2 && part2 === "CONT" && isNoteActive) {
        currentNote += part3 + "\n";
      } else if (level >= 2 && part2 === "CONC" && isNoteActive) {
        currentNote = currentNote.trimEnd() + part3 + "\n";
      }
    }
    
    // Traitement pour une Famille (FAM)
    if (currentFam) {
      if (level === 1) {
        currentEvent = null;
        
        switch (part2) {
          case "HUSB":
            currentFam.husbandId = part3.replace(/@/g, "");
            break;
          case "WIFE":
            currentFam.wifeId = part3.replace(/@/g, "");
            break;
          case "CHIL":
            currentFam.childrenIds.push(part3.replace(/@/g, ""));
            break;
          case "MARR":
          case "DIV":
            currentEvent = part2;
            if (part2 === "DIV") currentFam.isDivorced = true;
            break;
          case "NOTE":
            isNoteActive = true;
            currentNote = part3 + "\n";
            break;
        }
      } else if (level === 2 && currentEvent) {
        switch (part2) {
          case "DATE":
            if (currentEvent === "MARR") currentFam.weddingDate = part3;
            else if (currentEvent === "DIV") currentFam.divorceDate = part3;
            break;
          case "PLAC":
            if (currentEvent === "MARR") currentFam.weddingPlace = part3;
            break;
        }
      } else if (level >= 2 && part2 === "CONT" && isNoteActive) {
        currentNote += part3 + "\n";
      } else if (level >= 2 && part2 === "CONC" && isNoteActive) {
        currentNote = currentNote.trimEnd() + part3 + "\n";
      }
    }
  }
  
  // Sauvegarde de la dernière note si active
  if (isNoteActive) {
    if (currentIndi) currentIndi.notes = currentNote.trim();
    else if (currentFam) currentFam.notes = currentNote.trim();
  }
  
  // Deuxième passe : Enregistrement en base SQLite
  // Pour éviter des problèmes de clés étrangères durant l'insertion en masse, 
  // on vide d'abord la base (ou on gère un import propre sans doublons).
  // Pour ce projet, on va nettoyer la base de données existante pour avoir un import propre.
  await prisma.$transaction([
    prisma.media.deleteMany({ where: { treeId } }),
    prisma.union.deleteMany({ where: { treeId } }),
    prisma.person.deleteMany({ where: { treeId } }),
  ]);
  
  // Map pour faire correspondre les ID GEDCOM (ex: I1) avec les UUID de notre base de données
  const idMap: Map<string, string> = new Map();
  
  // 1. Création de toutes les personnes (sans relations parentales pour l'instant)
  const createdPeople = [];
  for (const [gedcomId, indi] of indis.entries()) {
    const person = await prisma.person.create({
      data: {
        treeId,
        firstName: indi.firstName,
        lastName: indi.lastName,
        birthName: indi.birthName || null,
        gender: indi.gender,
        birthDate: indi.birthDate || null,
        birthPlace: indi.birthPlace || null,
        baptismDate: indi.baptismDate || null,
        baptismPlace: indi.baptismPlace || null,
        deathDate: indi.deathDate || null,
        deathPlace: indi.deathPlace || null,
        burialDate: indi.burialDate || null,
        burialPlace: indi.burialPlace || null,
        occupation: indi.occupation || null,
        notes: indi.notes || null,
      },
    });
    idMap.set(gedcomId, person.id);
    createdPeople.push(person);
  }
  
  // 2. Traitement des familles pour :
  //    - Établir les mariages (Unions)
  //    - Mettre à jour les fatherId / motherId des enfants
  let unionsCount = 0;
  
  for (const fam of fams.values()) {
    const partner1DbId = fam.husbandId ? idMap.get(fam.husbandId) : null;
    const partner2DbId = fam.wifeId ? idMap.get(fam.wifeId) : null;
    
    // Établir les relations parentales pour les enfants de cette famille
    for (const childGedcomId of fam.childrenIds) {
      const childDbId = idMap.get(childGedcomId);
      if (childDbId) {
        await prisma.person.update({
          where: { id: childDbId },
          data: {
            fatherId: partner1DbId || null,
            motherId: partner2DbId || null,
          },
        });
      }
    }
    
    // Créer l'union si nous avons les deux partenaires
    if (partner1DbId && partner2DbId) {
      await prisma.union.create({
        data: {
          treeId,
          partner1Id: partner1DbId,
          partner2Id: partner2DbId,
          type: fam.weddingDate || fam.weddingPlace ? "MARRIAGE" : "PARTNERSHIP",
          weddingDate: fam.weddingDate || null,
          weddingPlace: fam.weddingPlace || null,
          divorceDate: fam.divorceDate || null,
          isDivorced: fam.isDivorced,
          notes: fam.notes || null,
        },
      });
      unionsCount++;
    }
  }
  
  return {
    peopleCount: createdPeople.length,
    unionsCount,
  };
}
