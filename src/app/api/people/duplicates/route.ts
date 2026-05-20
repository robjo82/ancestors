import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getCurrentUser, getActiveTreeIdForUser } from "../../../../lib/auth";
import { parseDate } from "../../../../utils/dateParser";

const getYearOnly = (dateStr: string | null | undefined): string => {
  const parsed = parseDate(dateStr);
  return parsed.year ? String(parsed.year) : "";
};

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const activeTreeId = await getActiveTreeIdForUser(user.id);
    if (!activeTreeId) {
      return NextResponse.json({ error: "Aucun arbre actif sélectionné." }, { status: 400 });
    }

    // Récupérer tous les individus de l'arbre
    const people = await prisma.person.findMany({
      where: {
        treeId: activeTreeId,
      },
      orderBy: [
        { lastName: "asc" },
        { firstName: "asc" },
      ],
    });

    const buckets: Record<string, typeof people> = {};
    
    // Groupement par les 3 premières lettres du nom et la première lettre du prénom
    for (const person of people) {
      const ln = (person.lastName || "").trim().toLowerCase();
      const fn = (person.firstName || "").trim().toLowerCase();
      if (!ln || !fn) continue;
      
      const bucketKey = `${ln.slice(0, 3)}_${fn.slice(0, 1)}`;
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = [];
      }
      buckets[bucketKey].push(person);
    }

    const duplicatesList: any[] = [];
    const seenPairs = new Set<string>();

    for (const key in buckets) {
      const bucket = buckets[key];
      if (bucket.length < 2) continue;

      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          const p1 = bucket[i];
          const p2 = bucket[j];

          // Assurer un identifiant de paire unique et trié
          const pairId = p1.id < p2.id ? `${p1.id}_${p2.id}` : `${p2.id}_${p1.id}`;
          if (seenPairs.has(pairId)) continue;
          seenPairs.add(pairId);

          const ln1 = p1.lastName.toLowerCase().trim();
          const ln2 = p2.lastName.toLowerCase().trim();
          const fn1 = p1.firstName.toLowerCase().trim();
          const fn2 = p2.firstName.toLowerCase().trim();

          // Doivent avoir un nom de famille identique
          const sameLastName = ln1 === ln2;
          if (!sameLastName) continue;

          // Prénoms identiques ou contenant des similitudes évidentes
          const sameFirstName = fn1 === fn2;
          const partialFirstName = 
            fn1.startsWith(fn2) || 
            fn2.startsWith(fn1) || 
            (fn1.length > 3 && fn2.length > 3 && (fn1.includes(fn2) || fn2.includes(fn1)));

          if (!sameFirstName && !partialFirstName) continue;

          // Sexe compatible (homonymes de sexes différents ne sont pas fusionnés)
          if (p1.gender !== p2.gender && p1.gender !== "U" && p2.gender !== "U") {
            continue;
          }

          // Année de naissance compatible
          const y1 = getYearOnly(p1.birthDate);
          const y2 = getYearOnly(p2.birthDate);

          let yearMatch = false;
          if (!y1 || !y2) {
            // L'une des dates est inconnue -> suspicion de doublon possible
            yearMatch = true;
          } else {
            const diff = Math.abs(parseInt(y1, 10) - parseInt(y2, 10));
            if (diff <= 5) {
              yearMatch = true;
            }
          }

          if (!yearMatch) continue;

          // Calcul d'un score de confiance (0 - 100)
          let score = 50;
          if (sameLastName) score += 20;
          if (sameFirstName) score += 20;
          if (y1 && y2 && y1 === y2) score += 10;
          if (p1.gender === p2.gender && p1.gender !== "U") score += 5;

          duplicatesList.push({
            id: pairId,
            personA: p1,
            personB: p2,
            score: Math.min(score, 100),
          });
        }
      }
    }

    // Trier du score le plus élevé au plus bas
    duplicatesList.sort((a, b) => b.score - a.score);

    return NextResponse.json(duplicatesList);
  } catch (error: any) {
    console.error("Erreur lors de la détection des doublons:", error);
    return NextResponse.json(
      { error: "Impossible de lancer la détection des doublons." },
      { status: 500 }
    );
  }
}
