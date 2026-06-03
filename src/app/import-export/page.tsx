"use client";

import { useState, useEffect } from "react";

export default function ImportExportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    peopleCount?: number;
    unionsCount?: number;
    message?: string;
    error?: string;
  } | null>(null);

  const [exporting, setExporting] = useState(false);

  // FamilySearch states
  const [fsConnected, setFsConnected] = useState(false);
  const [fsChecking, setFsChecking] = useState(true);
  const [fsContactName, setFsContactName] = useState("");
  const [fsGenerations, setFsGenerations] = useState(4);
  const [fsImporting, setFsImporting] = useState(false);
  const [fsResult, setFsResult] = useState<{
    success: boolean;
    peopleCount?: number;
    unionsCount?: number;
    message?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetchFsStatus();
  }, []);

  const fetchFsStatus = async () => {
    try {
      const response = await fetch("/api/auth/familysearch/status");
      if (response.ok) {
        const data = await response.json();
        setFsConnected(data.connected);
        setFsContactName(data.fsContactName || "");
      }
    } catch (err) {
      console.error("Error fetching FamilySearch status on import page:", err);
    } finally {
      setFsChecking(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".ged") || droppedFile.name.endsWith(".gedcom")) {
        setFile(droppedFile);
        setImportResult(null);
      } else {
        alert("Veuillez sélectionner un fichier généalogique au format standard .ged");
      }
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/gedcom", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setImportResult({
          success: true,
          peopleCount: data.peopleCount,
          unionsCount: data.unionsCount,
          message: data.message,
        });
        setFile(null);
      } else {
        setImportResult({
          success: false,
          error: data.error || "Une erreur est survenue lors de l'importation.",
        });
      }
    } catch (err) {
      console.error(err);
      setImportResult({
        success: false,
        error: "Impossible de joindre le serveur. Veuillez vérifier votre conteneur Docker.",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleExportDownload = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/gedcom");
      if (!response.ok) throw new Error("Échec d'exportation");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_genealogie_${new Date().toISOString().substring(0,10)}.ged`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors du téléchargement de l'arbre généalogique.");
    } finally {
      setExporting(false);
    }
  };

  const handleFsImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("⚠️ ATTENTION : La synchronisation avec FamilySearch va écraser TOUTES les données locales actuelles de votre arbre actif. Cette action est irréversible. Voulez-vous continuer ?")) {
      return;
    }

    setFsImporting(true);
    setFsResult(null);

    try {
      const response = await fetch(`/api/familysearch/import?generations=${fsGenerations}`, {
        method: "POST"
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setFsResult({
          success: true,
          peopleCount: data.peopleCount,
          unionsCount: data.unionsCount,
          message: data.message
        });
      } else {
        setFsResult({
          success: false,
          error: data.error || "Une erreur est survenue lors de la synchronisation."
        });
      }
    } catch (err) {
      console.error(err);
      setFsResult({
        success: false,
        error: "Impossible de joindre le serveur de synchronisation. Veuillez vérifier le conteneur."
      });
    } finally {
      setFsImporting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      {/* En-tête */}
      <section className="glass" style={{ padding: "2rem", textAlign: "center" }}>
        <h1 className="title-font" style={{ fontSize: "2rem", color: "var(--accent-gold)", fontWeight: 700, marginBottom: "0.5rem" }}>
          📤 Importation & Exportation GEDCOM
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Transférez facilement votre arbre généalogique. Le format **GEDCOM** est le standard mondial utilisé par Généanet, Heredis, MyHeritage et tous les logiciels classiques.
        </p>
      </section>

      {/* Grid multi-colonnes auto-fit */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
        
        {/* Colonne Import */}
        <div className="card glass" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h2 className="title-font" style={{ fontSize: "1.4rem", color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            📥 Importer un arbre
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            ⚠️ **Attention :** L'importation d'un nouveau fichier GEDCOM remplacera toutes les données actuellement enregistrées dans l'application pour garantir un arbre cohérent.
          </p>

          <form onSubmit={handleImportSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Zone de drop */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              style={{
                border: "2px dashed var(--border-subtle)",
                borderRadius: "12px",
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                background: "var(--bg-tertiary)",
                cursor: "pointer",
                transition: "var(--transition-smooth)",
                borderColor: file ? "var(--accent-emerald)" : "var(--border-subtle)",
              }}
              onClick={() => document.getElementById("gedcom-input")?.click()}
            >
              <input 
                type="file" 
                id="gedcom-input" 
                accept=".ged,.gedcom" 
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.5rem" }}>
                {file ? "📄" : "📁"}
              </span>
              {file ? (
                <strong style={{ color: "var(--text-primary)", fontSize: "0.95rem" }}>
                  {file.name} ({(file.size / 1024).toFixed(1)} Ko)
                </strong>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Glissez-déposez votre fichier .ged ici</strong>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>ou cliquez pour parcourir vos dossiers</span>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: "100%", padding: "1rem" }}
              disabled={!file || importing}
            >
              {importing ? "⏳ Importation en cours..." : "🚀 Lancer l'Importation"}
            </button>
          </form>

          {/* Résultats de l'import */}
          {importResult && (
            <div style={{
              padding: "1rem",
              borderRadius: "8px",
              background: importResult.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${importResult.success ? "var(--accent-emerald)" : "rgba(239, 68, 68, 0.4)"}`,
              fontSize: "0.9rem"
            }}>
              {importResult.success ? (
                <div>
                  <h4 style={{ color: "var(--accent-emerald)", fontWeight: 700, marginBottom: "0.25rem" }}>
                    ✅ Importation réussie !
                  </h4>
                  <p style={{ color: "var(--text-primary)" }}>{importResult.message}</p>
                  <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem", color: "var(--text-secondary)" }}>
                    <li>👥 Individus importés : **{importResult.peopleCount}**</li>
                    <li>💍 Unions et mariages créés : **{importResult.unionsCount}**</li>
                  </ul>
                  <a href="/tree" className="btn btn-secondary" style={{ marginTop: "1rem", width: "100%", fontSize: "0.85rem" }}>
                    🌿 Aller voir l'Arbre Interactif
                  </a>
                </div>
              ) : (
                <div>
                  <h4 style={{ color: "#ef4444", fontWeight: 700, marginBottom: "0.25rem" }}>
                    ❌ Échec de l'importation
                  </h4>
                  <p style={{ color: "var(--text-primary)" }}>{importResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Colonne Export */}
        <div className="card glass" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 className="title-font" style={{ fontSize: "1.4rem", color: "var(--accent-gold)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              📤 Exporter l'arbre
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Sauvegardez l'intégralité de votre travail généalogique dans un fichier standardisé.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Le fichier exporté inclura toutes les personnes créées manuellement ou modifiées, leurs unions, événements (naissances, mariages, décès) et notes. Vous pourrez ensuite l'ouvrir sur Généanet, Heredis ou MyHeritage en toute compatibilité.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "2rem" }}>
            <button 
              onClick={handleExportDownload} 
              className="btn btn-accent" 
              style={{ width: "100%", padding: "1rem" }}
              disabled={exporting}
            >
              {exporting ? "⏳ Génération de l'export..." : "💾 Télécharger mon fichier .ged"}
            </button>
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
              Format : GEDCOM 5.5.1 UTF-8. Compatible avec tous les logiciels de généalogie.
            </p>
          </div>
        </div>

        {/* Colonne FamilySearch Sync */}
        <div className="card glass" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 className="title-font" style={{ fontSize: "1.4rem", color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              🌍 Synchronisation FamilySearch
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              ⚠️ **Attention :** L'importation depuis FamilySearch remplacera TOUTES les données locales actuelles de votre arbre généalogique.
            </p>
            
            {fsChecking ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic" }}>
                ⏳ Vérification du compte...
              </p>
            ) : fsConnected ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  color: "hsl(142, 70%, 75%)"
                }}>
                  ✅ Connecté en tant que : <strong>{fsContactName}</strong>
                </div>

                <form onSubmit={handleFsImportSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: "0.85rem" }}>Nombre de générations d'ancêtres</label>
                    <select
                      className="input-field"
                      style={{ padding: "0.6rem" }}
                      value={fsGenerations}
                      onChange={(e) => setFsGenerations(parseInt(e.target.value, 10))}
                      disabled={fsImporting}
                    >
                      <option value={2}>2 générations (parents, grands-parents)</option>
                      <option value={3}>3 générations (8 personnes)</option>
                      <option value={4}>4 générations (15 personnes)</option>
                      <option value={5}>5 générations (31 personnes)</option>
                      <option value={6}>6 générations (63 personnes)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: "100%", padding: "0.85rem" }}
                    disabled={fsImporting}
                  >
                    {fsImporting ? "⏳ Synchronisation..." : "🔄 Importer depuis FamilySearch"}
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px dashed var(--border-subtle)",
                  padding: "1rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)"
                }}>
                  ℹ️ Votre compte FamilySearch n'est pas encore associé. Connectez-vous dans les paramètres pour activer cette fonction.
                </div>
                <a
                  href="/settings"
                  className="btn btn-secondary"
                  style={{ textDecoration: "none", textAlign: "center", padding: "0.85rem" }}
                >
                  ⚙️ Associer dans les paramètres
                </a>
              </div>
            )}
          </div>

          {/* Résultats de l'import FamilySearch */}
          {fsResult && (
            <div style={{
              padding: "1rem",
              borderRadius: "8px",
              background: fsResult.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${fsResult.success ? "var(--accent-emerald)" : "rgba(239, 68, 68, 0.4)"}`,
              fontSize: "0.9rem",
              marginTop: "1rem"
            }}>
              {fsResult.success ? (
                <div>
                  <h4 style={{ color: "var(--accent-emerald)", fontWeight: 700, marginBottom: "0.25rem" }}>
                    ✅ Arbre synchronisé !
                  </h4>
                  <p style={{ color: "var(--text-primary)" }}>{fsResult.message}</p>
                  <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem", color: "var(--text-secondary)" }}>
                    <li>👥 Individus créés : **{fsResult.peopleCount}**</li>
                    <li>💍 Unions créées : **{fsResult.unionsCount}**</li>
                  </ul>
                  <a href="/tree" className="btn btn-secondary" style={{ marginTop: "1rem", width: "100%", fontSize: "0.85rem" }}>
                    🌿 Aller voir l'Arbre Interactif
                  </a>
                </div>
              ) : (
                <div>
                  <h4 style={{ color: "#ef4444", fontWeight: 700, marginBottom: "0.25rem" }}>
                    ❌ Échec de la synchronisation
                  </h4>
                  <p style={{ color: "var(--text-primary)" }}>{fsResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
