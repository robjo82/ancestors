import { prisma } from "../../lib/db";

// Interface for demographic stats computed in Prisma
interface DemographicStats {
  peopleCount: number;
  unionsCount: number;
  menCount: number;
  womenCount: number;
  unknownCount: number;
  averageLifespan: number;
  averageLifespanMen: number;
  averageLifespanWomen: number;
  birthPlaces: { place: string; count: number }[];
  occupations: { title: string; count: number }[];
  centuryBreakdown: { century: string; count: number }[];
}

// Function to extract valid year from a date string
function extractYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/\d{4}/);
  if (match) {
    const year = parseInt(match[0], 10);
    if (year > 1000 && year < 2100) return year;
  }
  return null;
}

export default async function StatisticsPage() {
  // 1. Fetch basic counts
  const peopleCount = await prisma.person.count();
  const unionsCount = await prisma.union.count();
  const menCount = await prisma.person.count({ where: { gender: "M" } });
  const womenCount = await prisma.person.count({ where: { gender: "F" } });
  const unknownCount = peopleCount - menCount - womenCount;

  // Fetch all people with dates, places, and occupations to perform complete demographic parsing
  const people = await prisma.person.findMany({
    select: {
      gender: true,
      birthDate: true,
      deathDate: true,
      birthPlace: true,
      occupation: true,
    },
  });

  // 2. Compute lifespans
  let totalLifespan = 0;
  let totalLifespanCount = 0;
  let menLifespan = 0;
  let menLifespanCount = 0;
  let womenLifespan = 0;
  let womenLifespanCount = 0;

  // 3. Compute top locations & occupations
  const birthPlaceCounts: Record<string, number> = {};
  const occupationCounts: Record<string, number> = {};

  // 4. Century breakdown
  const centuryCounts = {
    before1800: 0,
    c19th: 0, // 1800-1899
    c20thEarly: 0, // 1900-1949
    c20thLate: 0, // 1950-1999
    c21st: 0, // 2000+
  };

  people.forEach((p) => {
    // Lifespan
    const birthYear = extractYear(p.birthDate);
    const deathYear = extractYear(p.deathDate);

    if (birthYear !== null && deathYear !== null) {
      const ageAtDeath = deathYear - birthYear;
      if (ageAtDeath >= 0 && ageAtDeath <= 125) {
        totalLifespan += ageAtDeath;
        totalLifespanCount++;

        if (p.gender === "M") {
          menLifespan += ageAtDeath;
          menLifespanCount++;
        } else if (p.gender === "F") {
          womenLifespan += ageAtDeath;
          womenLifespanCount++;
        }
      }
    }

    // Century breakdown
    if (birthYear !== null) {
      if (birthYear < 1800) {
        centuryCounts.before1800++;
      } else if (birthYear < 1900) {
        centuryCounts.c19th++;
      } else if (birthYear < 1950) {
        centuryCounts.c20thEarly++;
      } else if (birthYear < 2000) {
        centuryCounts.c20thLate++;
      } else {
        centuryCounts.c21st++;
      }
    }

    // Places
    if (p.birthPlace && p.birthPlace.trim()) {
      const cleanPlace = p.birthPlace.trim();
      birthPlaceCounts[cleanPlace] = (birthPlaceCounts[cleanPlace] || 0) + 1;
    }

    // Occupations
    if (p.occupation && p.occupation.trim()) {
      const cleanOccupation = p.occupation.trim();
      occupationCounts[cleanOccupation] = (occupationCounts[cleanOccupation] || 0) + 1;
    }
  });

  // Calculate averages safely
  const averageLifespan = totalLifespanCount > 0 ? Math.round(totalLifespan / totalLifespanCount) : 0;
  const averageLifespanMen = menLifespanCount > 0 ? Math.round(menLifespan / menLifespanCount) : 0;
  const averageLifespanWomen = womenLifespanCount > 0 ? Math.round(womenLifespan / womenLifespanCount) : 0;

  // Format and sort locations (Top 5)
  const topBirthPlaces = Object.entries(birthPlaceCounts)
    .map(([place, count]) => ({ place, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Format and sort occupations (Top 5)
  const topOccupations = Object.entries(occupationCounts)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const centuryBreakdown = [
    { century: "Avant 1800", count: centuryCounts.before1800 },
    { century: "XIXe Siècle (1800-1899)", count: centuryCounts.c19th },
    { century: "Début XXe (1900-1949)", count: centuryCounts.c20thEarly },
    { century: "Fin XXe (1950-1999)", count: centuryCounts.c20thLate },
    { century: "XXIe Siècle (2000+)", count: centuryCounts.c21st },
  ];

  // Helper percentages for rendering gauges
  const menPercent = peopleCount > 0 ? Math.round((menCount / peopleCount) * 100) : 0;
  const womenPercent = peopleCount > 0 ? Math.round((womenCount / peopleCount) * 100) : 0;
  const unknownPercent = peopleCount > 0 ? Math.round((unknownCount / peopleCount) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header section */}
      <section className="glass" style={{ padding: "2.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h1 className="title-font" style={{ fontSize: "2.5rem", color: "var(--accent-gold)", fontWeight: 800, margin: 0 }}>
          📈 Statistiques Démographiques
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: "800px" }}>
          Explorez des analyses sociodémographiques précises basées sur les fiches enregistrées. Suivez l'espérance de vie historique, les mouvements migratoires familiaux et l'histoire sociale de vos ancêtres.
        </p>
      </section>

      {/* Overview Cards row */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
        <div className="card stat-card glass">
          <span className="stat-card-value">{peopleCount}</span>
          <span className="stat-card-label">👥 Total Individus</span>
        </div>
        <div className="card stat-card glass">
          <span className="stat-card-value">{unionsCount}</span>
          <span className="stat-card-label">💍 Couples Formés</span>
        </div>
        <div className="card stat-card glass">
          <span className="stat-card-value" style={{ color: "var(--accent-gold)" }}>{averageLifespan ? `${averageLifespan} ans` : "N/D"}</span>
          <span className="stat-card-label">⏳ Espérance de vie globale</span>
        </div>
        <div className="card stat-card glass">
          <span className="stat-card-value" style={{ color: "var(--accent-emerald)" }}>{totalLifespanCount}</span>
          <span className="stat-card-label">📖 Actes de Décès datés</span>
        </div>
      </section>

      {/* Lifespans & Genders layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Gender distribution Card */}
        <div className="card glass" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h3 className="title-font" style={{ fontSize: "1.4rem", color: "var(--accent-gold)", margin: 0 }}>
            ♂/♀ Répartition par Sexe
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Custom Multi-bar Gauge */}
            <div style={{ 
              display: "flex", 
              height: "24px", 
              borderRadius: "12px", 
              overflow: "hidden", 
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              width: "100%" 
            }}>
              {menPercent > 0 && <div style={{ width: `${menPercent}%`, background: "linear-gradient(90deg, #1e3a8a, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "#fff", fontWeight: "bold" }}>{menPercent}%</div>}
              {womenPercent > 0 && <div style={{ width: `${womenPercent}%`, background: "linear-gradient(90deg, #db2777, #ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "#fff", fontWeight: "bold" }}>{womenPercent}%</div>}
              {unknownPercent > 0 && <div style={{ width: `${unknownPercent}%`, background: "#4b5563", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "#fff", fontWeight: "bold" }}>{unknownPercent}%</div>}
            </div>

            <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "1rem", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "6px", background: "#3b82f6", display: "inline-block" }}></span>
                <span style={{ fontSize: "0.95rem" }}>Hommes ({menCount})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "6px", background: "#ec4899", display: "inline-block" }}></span>
                <span style={{ fontSize: "0.95rem" }}>Femmes ({womenCount})</span>
              </div>
              {unknownCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "6px", background: "#4b5563", display: "inline-block" }}></span>
                  <span style={{ fontSize: "0.95rem" }}>Non déterminé ({unknownCount})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Life Expectancy Card */}
        <div className="card glass" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h3 className="title-font" style={{ fontSize: "1.4rem", color: "var(--accent-gold)", margin: 0 }}>
            ⏳ Âge Moyen de Décès (Généalogie)
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>👨‍🦳 Hommes</span>
              <strong style={{ fontSize: "1.3rem", color: "#60a5fa" }}>{averageLifespanMen ? `${averageLifespanMen} ans` : "N/D"}</strong>
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${(averageLifespanMen / 100) * 100}%`, background: "#3b82f6", height: "100%" }}></div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>👩‍🦳 Femmes</span>
              <strong style={{ fontSize: "1.3rem", color: "#f472b6" }}>{averageLifespanWomen ? `${averageLifespanWomen} ans` : "N/D"}</strong>
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${(averageLifespanWomen / 100) * 100}%`, background: "#ec4899", height: "100%" }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Places & Occupations */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Top Birth Places */}
        <div className="card glass" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h3 className="title-font" style={{ fontSize: "1.4rem", color: "var(--accent-gold)", margin: 0 }}>
            📍 Top 5 Lieux de Naissance
          </h3>
          
          {topBirthPlaces.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>Aucun lieu de naissance renseigné.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {topBirthPlaces.map((item, idx) => {
                const maxCount = topBirthPlaces[0].count;
                const percent = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                      <strong>{item.place}</strong>
                      <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>{item.count} individu{item.count > 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.05)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${percent}%`, background: "var(--accent-emerald)", height: "100%" }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Occupations */}
        <div className="card glass" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h3 className="title-font" style={{ fontSize: "1.4rem", color: "var(--accent-gold)", margin: 0 }}>
            💼 Top 5 Professions Historiques
          </h3>
          
          {topOccupations.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>Aucune profession renseignée.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {topOccupations.map((item, idx) => {
                const maxCount = topOccupations[0].count;
                const percent = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                      <strong>{item.title}</strong>
                      <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>{item.count} individu{item.count > 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.05)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${percent}%`, background: "var(--accent-gold)", height: "100%" }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Generations & Century Timeline */}
      <section className="card glass" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <h3 className="title-font" style={{ fontSize: "1.4rem", color: "var(--accent-gold)", margin: 0 }}>
          ⏱️ Évolution Chronologique des Naissances (Siècles)
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {centuryBreakdown.map((item, idx) => {
            // Find max for layout scaling
            const maxCount = Math.max(...centuryBreakdown.map(c => c.count), 1);
            const percent = Math.round((item.count / maxCount) * 100);
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <span style={{ width: "200px", fontSize: "0.95rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {item.century}
                </span>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", height: "14px", borderRadius: "7px", overflow: "hidden", display: "flex" }}>
                  {item.count > 0 && (
                    <div style={{ 
                      width: `${percent}%`, 
                      background: "linear-gradient(90deg, var(--accent-emerald), var(--accent-gold))", 
                      height: "100%",
                      borderRadius: "7px"
                    }}></div>
                  )}
                </div>
                <span style={{ width: "60px", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
