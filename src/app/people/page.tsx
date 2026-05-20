import { prisma } from "../../lib/db";
import { getCurrentUser, getActiveTreeIdForUser } from "../../lib/auth";
import { redirect } from "next/navigation";

export default async function PeopleDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; gender?: string; century?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const activeTreeId = await getActiveTreeIdForUser(user.id);

  const params = await searchParams;
  const q = params.q || "";
  const gender = params.gender || "";
  const century = params.century || "";

  // 1. Construire les conditions de filtre pour Prisma
  const whereClause: any = {
    treeId: activeTreeId,
  };

  // Filtre par recherche texte libre
  if (q) {
    whereClause.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { birthName: { contains: q } },
      { occupation: { contains: q } },
      { birthPlace: { contains: q } },
      { deathPlace: { contains: q } },
    ];
  }

  // Filtre par genre
  if (gender) {
    whereClause.gender = gender;
  }

  // Récupérer toutes les personnes filtrées (on filtrera le siècle en mémoire si nécessaire, 
  // car les dates généalogiques peuvent être textuelles comme "circa 1845")
  let people = await prisma.person.findMany({
    where: whereClause,
    orderBy: [
      { lastName: "asc" },
      { firstName: "asc" },
    ],
  });

  // Filtre par siècle (ex: "20" pour 1900-1999)
  if (century) {
    people = people.filter((p: any) => {
      if (!p.birthDate) return false;
      // Extraire l'année (4 chiffres consécutifs)
      const yearMatch = p.birthDate.match(/\d{4}/);
      if (!yearMatch) return false;
      const year = parseInt(yearMatch[0], 10);
      
      const cent = Math.floor(year / 100) + 1;
      return cent.toString() === century;
    });
  }

  // Extraire tous les noms de famille uniques pour afficher un petit filtre alphabétique rapide
  const allSurnames = Array.from(new Set(people.map((p: any) => p.lastName?.toUpperCase()).filter(Boolean))).sort();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* En-tête avec Recherche */}
      <section className="glass" style={{ padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 className="title-font" style={{ fontSize: "2rem", color: "var(--accent-gold)", fontWeight: 700 }}>
              📇 Annuaire des Ancêtres
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Parcourez et filtrez tous les membres enregistrés dans votre généalogie.
            </p>
          </div>
          <a href="/people/new" className="btn btn-accent" style={{ borderRadius: "8px" }}>
            ➕ Ajouter un individu
          </a>
        </div>

        {/* Formulaire de recherche et filtres */}
        <form method="GET" action="/people" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Nom ou Prénom</label>
            <input 
              type="text" 
              name="q" 
              placeholder="Rechercher..." 
              defaultValue={q}
              className="input-field" 
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Genre</label>
            <select name="gender" defaultValue={gender} className="input-field" style={{ cursor: "pointer" }}>
              <option value="">Tous les genres</option>
              <option value="M">♂ Hommes</option>
              <option value="F">♀ Femmes</option>
              <option value="U">❓ Inconnu</option>
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Siècle de Naissance</label>
            <select name="century" defaultValue={century} className="input-field" style={{ cursor: "pointer" }}>
              <option value="">Tous les siècles</option>
              <option value="21">XXIe siècle (2000+)</option>
              <option value="20">XXe siècle (1900-1999)</option>
              <option value="19">XIXe siècle (1800-1899)</option>
              <option value="18">XVIIIe siècle (1700-1799)</option>
              <option value="17">XVIIe siècle (1600-1699)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 1.5rem" }}>
              Filtrer
            </button>
            {(q || gender || century) && (
              <a href="/people" className="btn btn-secondary" style={{ padding: "0.75rem 1.25rem" }}>
                Réinitialiser
              </a>
            )}
          </div>
        </form>
      </section>

      {/* Liste des résultats */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.2rem", color: "var(--text-primary)" }}>
            🔍 {people.length} membre{people.length > 1 ? "s" : ""} trouvé{people.length > 1 ? "s" : ""}
          </h2>
        </div>

        {people.length === 0 ? (
          <div className="card glass" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>🔍</span>
            <p style={{ fontSize: "1.1rem" }}>Aucun ancêtre ne correspond à vos critères de recherche.</p>
            <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>Essayer d'élargir votre recherche ou ajoutez un nouveau profil.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {people.map((p: any) => {
              // Déterminer la couleur de la carte en fonction du genre
              const borderStyle = p.gender === "M" ? "3px solid rgba(59, 130, 246, 0.4)" : 
                                  p.gender === "F" ? "3px solid rgba(236, 72, 153, 0.4)" : 
                                  "3px solid rgba(156, 163, 175, 0.4)";
              
              const genderSymbol = p.gender === "M" ? "♂" : p.gender === "F" ? "♀" : "❓";

              return (
                <a 
                  key={p.id} 
                  href={`/people/${p.id}`}
                  className="card glass list-item-hover"
                  style={{ 
                    borderLeft: borderStyle, 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "0.75rem",
                    padding: "1.25rem",
                    transition: "var(--transition-smooth)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 className="title-font" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {p.firstName} {p.lastName?.toUpperCase()}
                      </h3>
                      {p.birthName && (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginTop: "-0.1rem" }}>
                          (née {p.birthName.toUpperCase()})
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "1.2rem" }}>{genderSymbol}</span>
                  </div>

                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div>
                      📅 {p.birthDate ? p.birthDate.substring(0, 4) : "????"}{p.deathDate ? ` - ${p.deathDate.substring(0, 4)}` : ""}
                    </div>
                    {p.birthPlace && (
                      <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        📍 <strong>Naissance :</strong> {p.birthPlace}
                      </div>
                    )}
                    {p.occupation && (
                      <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        💼 <strong>Métier :</strong> {p.occupation}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--accent-gold)", fontWeight: 600 }}>
                      Voir la fiche ➜
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
