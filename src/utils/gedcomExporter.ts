import { prisma } from "../lib/db";

/**
 * Formate une date au format GEDCOM si possible (ex: "1923-04-12" ou "12/04/1923" -> "12 APR 1923")
 * Si la date n'est pas standard, on l'exporte textuelle de manière brute.
 */
function formatGedcomDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  // Si c'est déjà du format GEDCOM (ex: 12 APR 1923 ou ABT 1890), on garde
  if (/[A-Z]{3}/.test(dateStr)) return dateStr;
  
  const trimmed = dateStr.trim();
  
  // Format simple ISO: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const year = isoMatch[1];
    const month = months[parseInt(isoMatch[2], 10) - 1];
    const day = parseInt(isoMatch[3], 10).toString();
    return `${day} ${month} ${year}`;
  }
  
  // Format FR standard: DD/MM/YYYY
  const frMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (frMatch) {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const year = frMatch[3];
    const month = months[parseInt(frMatch[2], 10) - 1];
    const day = parseInt(frMatch[1], 10).toString();
    return `${day} ${month} ${year}`;
  }
  
  return trimmed;
}

/**
 * Exporte l'intégralité de la base SQLite au format texte GEDCOM 5.5.1.
 */
export async function exportGedcom(treeId: string): Promise<string> {
  const people = await prisma.person.findMany({
    where: { treeId },
    include: {
      unionsPartner1: true,
      unionsPartner2: true,
    },
  });
  
  const unions = await prisma.union.findMany({
    where: { treeId },
  });
  
  const lines: string[] = [];
  
  // 1. En-tête GEDCOM
  lines.push("0 HEAD");
  lines.push("1 SOUR ANCESTORS");
  lines.push("2 VERS 1.0.0");
  lines.push("2 NAME Ancestors Genealogy");
  lines.push("1 SUBM @SUBM1@");
  lines.push("1 GEDC");
  lines.push("2 VERS 5.5.1");
  lines.push("2 FORM LINEAGE-LINKED");
  lines.push("1 CHAR UTF-8");
  
  // Soumetteur fictif requis
  lines.push("0 @SUBM1@ SUBM");
  lines.push("1 NAME Grand-Pere & Ancestors");
  
  // Table de correspondance UUID en base -> IDs courts GEDCOM
  const dbIdToIndiId: Map<string, string> = new Map();
  people.forEach((p, idx) => {
    dbIdToIndiId.set(p.id, `@I${idx + 1}@`);
  });
  
  // Générer des IDs courts pour les familles parentales.
  // Une famille parentale unit un Père (fatherId) et une Mère (motherId) d'un ou plusieurs enfants.
  // Nous allons regrouper les enfants par leur paire de parents uniques pour former des familles.
  const parentPairsToFamId: Map<string, string> = new Map();
  let famCounter = 1;
  
  // Regrouper par paire de parents uniques (ex: "fatherId_motherId")
  people.forEach(p => {
    if (p.fatherId || p.motherId) {
      const key = `${p.fatherId || "null"}_${p.motherId || "null"}`;
      if (!parentPairsToFamId.has(key)) {
        parentPairsToFamId.set(key, `@F${famCounter++}@`);
      }
    }
  });
  
  // Regrouper également les mariages réels (unions en base)
  const unionToFamId: Map<string, string> = new Map();
  unions.forEach(u => {
    const key = `${u.partner1Id}_${u.partner2Id}`;
    let famId = parentPairsToFamId.get(key) || parentPairsToFamId.get(`${u.partner2Id}_${u.partner1Id}`);
    
    if (!famId) {
      famId = `@F${famCounter++}@`;
      parentPairsToFamId.set(key, famId);
    }
    unionToFamId.set(u.id, famId);
  });
  
  // 2. Exportation des Individus (INDI)
  for (const p of people) {
    const indiId = dbIdToIndiId.get(p.id)!;
    lines.push(`0 ${indiId} INDI`);
    
    // Nom et Prénom
    const lastNamePart = p.lastName ? `/${p.lastName.toUpperCase()}/` : "";
    lines.push(`1 NAME ${p.firstName || ""} ${lastNamePart}`.trim());
    if (p.firstName) lines.push(`2 GIVN ${p.firstName}`);
    if (p.lastName) lines.push(`2 SURN ${p.lastName}`);
    
    // Genre
    lines.push(`1 SEX ${p.gender || "U"}`);
    
    // Naissance
    if (p.birthDate || p.birthPlace) {
      lines.push("1 BIRT");
      const fDate = formatGedcomDate(p.birthDate);
      if (fDate) lines.push(`2 DATE ${fDate}`);
      if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`);
    }
    
    // Baptême
    if (p.baptismDate || p.baptismPlace) {
      lines.push("1 BAPM");
      const fDate = formatGedcomDate(p.baptismDate);
      if (fDate) lines.push(`2 DATE ${fDate}`);
      if (p.baptismPlace) lines.push(`2 PLAC ${p.baptismPlace}`);
    }
    
    // Décès
    if (p.deathDate || p.deathPlace) {
      lines.push("1 DEAT");
      const fDate = formatGedcomDate(p.deathDate);
      if (fDate) lines.push(`2 DATE ${fDate}`);
      if (p.deathPlace) lines.push(`2 PLAC ${p.deathPlace}`);
    }
    
    // Inhumation
    if (p.burialDate || p.burialPlace) {
      lines.push("1 BURI");
      const fDate = formatGedcomDate(p.burialDate);
      if (fDate) lines.push(`2 DATE ${fDate}`);
      if (p.burialPlace) lines.push(`2 PLAC ${p.burialPlace}`);
    }
    
    // Profession
    if (p.occupation) {
      lines.push(`1 OCCU ${p.occupation}`);
    }
    
    // Notes (découpage en CONT/CONC si la note est multi-lignes)
    if (p.notes) {
      const noteLines = p.notes.split(/\r?\n/);
      if (noteLines.length > 0) {
        lines.push(`1 NOTE ${noteLines[0]}`);
        for (let l = 1; l < noteLines.length; l++) {
          lines.push(`2 CONT ${noteLines[l]}`);
        }
      }
    }
    
    // Liens familiaux (conjoint, parents)
    // FAMS = Familles où l'individu est conjoint
    const myUnions = [
      ...p.unionsPartner1.map(u => unionToFamId.get(u.id)!),
      ...p.unionsPartner2.map(u => unionToFamId.get(u.id)!)
    ];
    // Éliminer les doublons éventuels
    const uniqueUnions = Array.from(new Set(myUnions.filter(Boolean)));
    uniqueUnions.forEach(famId => {
      lines.push(`1 FAMS ${famId}`);
    });
    
    // FAMC = Famille où l'individu est enfant
    if (p.fatherId || p.motherId) {
      const key = `${p.fatherId || "null"}_${p.motherId || "null"}`;
      const famId = parentPairsToFamId.get(key) || parentPairsToFamId.get(`${p.motherId || "null"}_${p.fatherId || "null"}`);
      if (famId) {
        lines.push(`1 FAMC ${famId}`);
      }
    }
  }
  
  // 3. Exportation des Familles (FAM)
  // Nous générons les blocs de famille basés sur notre map de paires de parents
  for (const [parentKey, famId] of parentPairsToFamId.entries()) {
    lines.push(`0 ${famId} FAM`);
    
    const [fatherIdStr, motherIdStr] = parentKey.split("_");
    
    const fatherGedId = fatherIdStr !== "null" ? dbIdToIndiId.get(fatherIdStr) : null;
    const motherGedId = motherIdStr !== "null" ? dbIdToIndiId.get(motherIdStr) : null;
    
    if (fatherGedId) lines.push(`1 HUSB ${fatherGedId}`);
    if (motherGedId) lines.push(`1 WIFE ${motherGedId}`);
    
    // Trouver les enfants de cette famille
    const children = people.filter(p => {
      const fMatch = (fatherIdStr === "null" && !p.fatherId) || (p.fatherId === fatherIdStr);
      const mMatch = (motherIdStr === "null" && !p.motherId) || (p.motherId === motherIdStr);
      return fMatch && mMatch && (p.fatherId || p.motherId);
    });
    
    children.forEach(c => {
      lines.push(`1 CHIL ${dbIdToIndiId.get(c.id)!}`);
    });
    
    // Trouver si un mariage réel existe pour ce couple
    const unionRecord = unions.find(u => 
      (u.partner1Id === fatherIdStr && u.partner2Id === motherIdStr) ||
      (u.partner1Id === motherIdStr && u.partner2Id === fatherIdStr)
    );
    
    if (unionRecord) {
      if (unionRecord.weddingDate || unionRecord.weddingPlace) {
        lines.push("1 MARR");
        const fDate = formatGedcomDate(unionRecord.weddingDate);
        if (fDate) lines.push(`2 DATE ${fDate}`);
        if (unionRecord.weddingPlace) lines.push(`2 PLAC ${unionRecord.weddingPlace}`);
      }
      
      if (unionRecord.isDivorced || unionRecord.divorceDate) {
        lines.push("1 DIV");
        const fDate = formatGedcomDate(unionRecord.divorceDate);
        if (fDate) lines.push(`2 DATE ${fDate}`);
      }
      
      if (unionRecord.notes) {
        const uNoteLines = unionRecord.notes.split(/\r?\n/);
        lines.push(`1 NOTE ${uNoteLines[0]}`);
        for (let l = 1; l < uNoteLines.length; l++) {
          lines.push(`2 CONT ${uNoteLines[l]}`);
        }
      }
    }
  }
  
  // 4. Fin du fichier (TRLR)
  lines.push("0 TRLR");
  
  return lines.join("\n");
}
