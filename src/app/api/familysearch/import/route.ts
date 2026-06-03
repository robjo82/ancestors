import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getActiveTreeIdForUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function extractName(fsPerson: any) {
  const nameObj = fsPerson.names?.[0] || {};
  const formObj = nameObj.nameForms?.[0] || {};
  const fullText = formObj.fullText || "";
  
  let firstName = "";
  let lastName = "";
  
  const parts = formObj.parts || [];
  const givenPart = parts.find((p: any) => p.type === "http://gedcomx.org/Given" || p.type?.endsWith("Given"));
  const surnamePart = parts.find((p: any) => p.type === "http://gedcomx.org/Surname" || p.type?.endsWith("Surname"));
  
  if (givenPart) firstName = givenPart.value || "";
  if (surnamePart) lastName = surnamePart.value || "";
  
  if (!firstName && !lastName && fullText) {
    const split = fullText.split(" ");
    firstName = split[0] || "";
    lastName = split.slice(1).join(" ") || "";
  }
  
  return {
    firstName: firstName || "Prénom inconnu",
    lastName: lastName || "Nom inconnu",
  };
}

function extractGender(fsPerson: any) {
  const type = fsPerson.gender?.type || "";
  if (type.endsWith("Male")) return "M";
  if (type.endsWith("Female")) return "F";
  return "U";
}

function extractFact(fsPerson: any, factTypeSuffix: string) {
  const facts = fsPerson.facts || [];
  const fact = facts.find((f: any) => f.type?.endsWith(factTypeSuffix));
  if (!fact) return { date: null, place: null };
  return {
    date: fact.date?.original || null,
    place: fact.place?.original || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
    }

    const connection = await prisma.familySearchConnection.findUnique({
      where: { userId: user.id }
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Vous devez connecter votre compte FamilySearch dans les paramètres au préalable." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const generations = parseInt(searchParams.get("generations") || "4", 10);

    const fsEnv = process.env.FAMILYSEARCH_ENV || "sandbox";
    const apiBaseUrl = fsEnv === "production"
      ? "https://api.familysearch.org"
      : "https://api-beta.familysearch.org";

    const headers = {
      "Accept": "application/json",
      "Authorization": `Bearer ${connection.accessToken}`,
    };

    // 1. Récupérer l'identifiant de la personne racine de l'utilisateur connecté
    console.log("Fetching current person from FamilySearch...");
    const rootPersonRes = await fetch(`${apiBaseUrl}/platform/tree/current-person`, { headers });
    
    if (!rootPersonRes.ok) {
      if (rootPersonRes.status === 401) {
        return NextResponse.json(
          { error: "Session FamilySearch expirée. Veuillez vous reconnecter dans les paramètres." },
          { status: 401 }
        );
      }
      const errText = await rootPersonRes.text();
      console.error("Error fetching current person:", errText);
      return NextResponse.json(
        { error: "Impossible de récupérer l'individu racine depuis FamilySearch." },
        { status: 500 }
      );
    }

    const rootPersonData = await rootPersonRes.json();
    const rootPersonId = rootPersonData.persons?.[0]?.id;

    if (!rootPersonId) {
      return NextResponse.json(
        { error: "Aucun individu racine trouvé dans votre arbre FamilySearch." },
        { status: 404 }
      );
    }

    // 2. Récupérer l'arbre des ascendants
    console.log(`Fetching ancestry for person ${rootPersonId} (${generations} generations)...`);
    const ancestryRes = await fetch(
      `${apiBaseUrl}/platform/tree/ancestry?person=${rootPersonId}&generations=${generations}&personDetails=true`,
      { headers }
    );

    if (!ancestryRes.ok) {
      const errText = await ancestryRes.text();
      console.error("Error fetching ancestry:", errText);
      return NextResponse.json(
        { error: "Impossible de charger l'arbre des ancêtres depuis FamilySearch." },
        { status: 500 }
      );
    }

    const ancestryData = await ancestryRes.json();
    const fsPersons = ancestryData.persons || [];

    if (fsPersons.length === 0) {
      return NextResponse.json({ success: true, peopleCount: 0, message: "Aucun ancêtre à importer." });
    }

    // 3. Vider l'arbre généalogique actif actuel de l'utilisateur (comportement identique à l'import GEDCOM)
    const treeId = await getActiveTreeIdForUser(user.id);
    
    await prisma.$transaction([
      prisma.union.deleteMany({ where: { treeId } }),
      prisma.media.deleteMany({ where: { treeId } }),
      prisma.person.deleteMany({ where: { treeId } }),
    ]);

    // 4. Importer les personnes
    const ahnentafelToDbId = new Map<number, string>();
    const createdPeople = [];

    for (const fsPerson of fsPersons) {
      const ahnentafel = parseInt(
        fsPerson.display?.ascendancyNumber || 
        fsPerson.display?.ascendencyNumber || 
        "0", 
        10
      );

      if (!ahnentafel) continue;

      const { firstName, lastName } = extractName(fsPerson);
      const gender = extractGender(fsPerson);
      const birth = extractFact(fsPerson, "Birth");
      const death = extractFact(fsPerson, "Death");
      const baptism = extractFact(fsPerson, "Baptism");
      const burial = extractFact(fsPerson, "Burial");

      const dbPerson = await prisma.person.create({
        data: {
          firstName,
          lastName,
          gender,
          birthDate: birth.date,
          birthPlace: birth.place,
          deathDate: death.date,
          deathPlace: death.place,
          baptismDate: baptism.date,
          baptismPlace: baptism.place,
          burialDate: burial.date,
          burialPlace: burial.place,
          treeId,
        }
      });

      ahnentafelToDbId.set(ahnentafel, dbPerson.id);
      createdPeople.push(dbPerson);
    }

    // 5. Mettre à jour les liens de parenté (fatherId, motherId) et générer les Unions/Mariages
    const createdCouples = new Set<string>();
    let unionsCount = 0;

    for (const [ahnentafel, dbId] of ahnentafelToDbId.entries()) {
      const fatherAhnentafel = 2 * ahnentafel;
      const motherAhnentafel = 2 * ahnentafel + 1;

      const fatherId = ahnentafelToDbId.get(fatherAhnentafel) || null;
      const motherId = ahnentafelToDbId.get(motherAhnentafel) || null;

      if (fatherId || motherId) {
        await prisma.person.update({
          where: { id: dbId },
          data: {
            fatherId,
            motherId,
          }
        });
      }

      // Si les deux parents existent, on crée une union pour lier le couple de parents
      if (fatherId && motherId) {
        const coupleKey = [fatherId, motherId].sort().join("-");
        if (!createdCouples.has(coupleKey)) {
          await prisma.union.create({
            data: {
              partner1Id: fatherId,
              partner2Id: motherId,
              type: "MARRIAGE",
              treeId,
            }
          });
          createdCouples.add(coupleKey);
          unionsCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      peopleCount: createdPeople.length,
      unionsCount,
      message: `Votre arbre local a été écrasé et synchronisé avec succès avec ${createdPeople.length} individus et ${unionsCount} unions depuis FamilySearch.`
    });

  } catch (error: any) {
    console.error("Erreur générale lors de l'import FamilySearch:", error);
    return NextResponse.json(
      { error: "Une erreur interne s'est produite lors de la synchronisation de l'arbre." },
      { status: 500 }
    );
  }
}
