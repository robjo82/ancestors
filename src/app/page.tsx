import { prisma } from "../lib/db";

export const dynamic = "force-dynamic";

// Calcul de la profondeur maximale de l'arbre (nombre de générations)
async function getGenerationDepth(): Promise<number> {
  try {
    const people = await prisma.person.findMany({
      select: { id: true, fatherId: true, motherId: true }
    });
    
    if (people.length === 0) return 0;
    
    const memo = new Map<string, number>();
    
    function getDepth(personId: string): number {
      if (memo.has(personId)) return memo.get(personId)!;
      const person = people.find((p: any) => p.id === personId);
      if (!person) return 0;
      
      const fDepth = person.fatherId ? getDepth(person.fatherId) : 0;
      const mDepth = person.motherId ? getDepth(person.motherId) : 0;
      
      const depth = 1 + Math.max(fDepth, mDepth);
      memo.set(personId, depth);
      return depth;
    }
    
    let maxDepth = 0;
    people.forEach((p: any) => {
      maxDepth = Math.max(maxDepth, getDepth(p.id));
    });
    return maxDepth;
  } catch (e) {
    return 0;
  }
}

export default async function Home() {
  // Récupérer les statistiques directement depuis SQLite en une seule passe
  const peopleCount = await prisma.person.count();
  const unionsCount = await prisma.union.count();
  const menCount = await prisma.person.count({ where: { gender: "M" } });
  const womenCount = await prisma.person.count({ where: { gender: "F" } });
  const otherCount = peopleCount - menCount - womenCount;
  
  const maxGenerations = await getGenerationDepth();
  
  // Derniers profils modifiés
  const latestProfiles = await prisma.person.findMany({
    take: 5,
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* En-tête de bienvenue */}
      <section className="glass" style={{ padding: "2.5rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h1 className="title-font" style={{ fontSize: "2.5rem", color: "var(--accent-gold)", fontWeight: 800 }}>
          Arbre Généalogique de la Famille
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: "700px", margin: "0 auto" }}>
          Bienvenue dans votre outil moderne d'exploration familiale. Parcourez l'histoire de vos ancêtres, complétez votre arbre et conservez votre mémoire familiale.
        </p>
        
        {/* Barre de recherche globale native */}
        <form action="/people" method="GET" style={{ display: "flex", gap: "0.5rem", maxWidth: "600px", width: "100%", margin: "1.5rem auto 0 auto" }}>
          <input 
            type="text" 
            name="q" 
            placeholder="Rechercher un ancêtre par nom, prénom, métier, lieu..." 
            className="input-field" 
            style={{ flex: 1, borderRadius: "10px" }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ borderRadius: "10px", padding: "0 1.5rem" }}>
            🔍 Rechercher
          </button>
        </form>
      </section>

      {/* Grille des statistiques */}
      <section>
        <h2 className="title-font" style={{ fontSize: "1.5rem", marginBottom: "1.25rem", color: "var(--text-primary)" }}>
          Chiffres Clés de l'Arbre
        </h2>
        <div className="stats-grid">
          <div className="card stat-card glass">
            <span className="stat-card-value">{peopleCount}</span>
            <span className="stat-card-label">👤 Individus</span>
          </div>
          <div className="card stat-card glass">
            <span className="stat-card-value">{maxGenerations}</span>
            <span className="stat-card-label">🌿 Générations</span>
          </div>
          <div className="card stat-card glass">
            <span className="stat-card-value">{unionsCount}</span>
            <span className="stat-card-label">💍 Unions / Mariages</span>
          </div>
          <div className="card stat-card glass">
            <span className="stat-card-value" style={{ color: "var(--accent-emerald)" }}>
              {menCount} ♂ / {womenCount} ♀
            </span>
            <span className="stat-card-label">Hommes / Femmes</span>
          </div>
        </div>
      </section>

      {/* Section interactive à double colonne */}
      <div className="dashboard-grid">
        {/* Colonne 1 : Dernières modifications & Actions rapides */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className="card glass">
            <h3 className="title-font" style={{ fontSize: "1.3rem", color: "var(--accent-gold)", marginBottom: "1rem" }}>
              ⏱️ Modifications Récentes
            </h3>
            {latestProfiles.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontStyle: "italic", padding: "1rem 0" }}>
                Aucun ancêtre n'a encore été créé. Commencez par importer un fichier GEDCOM ou ajoutez une personne manuellement.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {latestProfiles.map((p: any) => (
                  <a 
                    key={p.id} 
                    href={`/people/${p.id}`}
                    style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      padding: "0.75rem 1rem", 
                      background: "var(--bg-tertiary)", 
                      borderRadius: "8px", 
                      border: "1px solid var(--border-subtle)",
                      transition: "var(--transition-fast)" 
                    }}
                    className="list-item-hover"
                  >
                    <div>
                      <strong style={{ color: "var(--text-primary)" }}>
                        {p.firstName} {p.lastName?.toUpperCase()}
                      </strong>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: "0.75rem" }}>
                        {p.occupation || "Sans profession"}
                      </span>
                    </div>
                    <span style={{ color: "var(--accent-emerald)", fontSize: "0.85rem", fontWeight: 600 }}>
                      {p.birthDate ? p.birthDate.substring(0, 4) : "????"} - {p.deathDate ? p.deathDate.substring(0, 4) : p.gender === "M" ? "Vivant" : "Vivante"}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonne 2 : Raccourcis & Actions rapides */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card glass" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 className="title-font" style={{ fontSize: "1.3rem", color: "var(--accent-gold)" }}>
              ⚡ Actions Rapides
            </h3>
            
            <a href="/tree" className="btn btn-primary" style={{ width: "100%", padding: "1rem" }}>
              🌿 Explorer l'Arbre Interactif
            </a>
            
            <a href="/import-export" className="btn btn-accent" style={{ width: "100%", padding: "1rem" }}>
              📤 Importer / Exporter un GEDCOM
            </a>
            
            <a href="/people" className="btn btn-secondary" style={{ width: "100%", padding: "1rem" }}>
              📇 Consulter l'Annuaire Familial
            </a>
            
            <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: "0.5rem 0" }} />
            
            <a href="/people/new" className="btn btn-secondary" style={{ width: "100%", borderColor: "var(--accent-emerald)" }}>
              ➕ Créer un individu manuellement
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
