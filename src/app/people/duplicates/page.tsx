"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseDate } from "../../../utils/dateParser";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  birthName: string | null;
  gender: string;
  birthDate: string | null;
  birthPlace: string | null;
  baptismDate: string | null;
  baptismPlace: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  burialDate: string | null;
  burialPlace: string | null;
  occupation: string | null;
  notes: string | null;
  sources: string | null;
  avatarUrl: string | null;
  fatherId: string | null;
  motherId: string | null;
}

interface DuplicatePair {
  id: string;
  personA: Person;
  personB: Person;
  score: number;
}

const getYearOnly = (dateStr: string | null | undefined): string => {
  const parsed = parseDate(dateStr);
  return parsed.year ? String(parsed.year) : "";
};

export default function DuplicatesPage() {
  const router = useRouter();
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // State for active merge
  const [selectedPair, setSelectedPair] = useState<DuplicatePair | null>(null);
  const [keepId, setKeepId] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string>("");
  const [mergedFields, setMergedFields] = useState<Partial<Person>>({});
  const [merging, setMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState(false);

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/people/duplicates");
      if (response.ok) {
        const data = await response.json();
        setDuplicates(data);
      } else {
        setError("Erreur lors de la récupération des doublons.");
      }
    } catch (err) {
      console.error(err);
      setError("Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  const countFilledFields = (person: Person): number => {
    let count = 0;
    const fieldsToCount: (keyof Person)[] = [
      "birthName", "birthDate", "birthPlace", "baptismDate", "baptismPlace",
      "deathDate", "deathPlace", "burialDate", "burialPlace", "occupation",
      "notes", "sources", "avatarUrl", "fatherId", "motherId"
    ];
    for (const f of fieldsToCount) {
      if (person[f] !== null && person[f] !== "") {
        count++;
      }
    }
    return count;
  };

  const startMerge = (pair: DuplicatePair) => {
    const countA = countFilledFields(pair.personA);
    const countB = countFilledFields(pair.personB);
    
    // Default to keep the profile with more info
    const preferredKeep = countA >= countB ? pair.personA.id : pair.personB.id;
    const preferredDelete = countA >= countB ? pair.personB.id : pair.personA.id;
    
    setSelectedPair(pair);
    setKeepId(preferredKeep);
    setDeleteId(preferredDelete);
    
    // Initialize merged fields with values from A, filled with B where A is empty
    const initialMerged: Partial<Person> = {};
    const keys: (keyof Person)[] = [
      "firstName", "lastName", "birthName", "gender", "birthDate", "birthPlace",
      "baptismDate", "baptismPlace", "deathDate", "deathPlace", "burialDate",
      "burialPlace", "occupation", "notes", "sources", "avatarUrl", "fatherId", "motherId"
    ];
    
    for (const key of keys) {
      initialMerged[key] = (pair.personA[key] || pair.personB[key] || "") as any;
    }
    
    setMergedFields(initialMerged);
    setMergeSuccess(false);
  };

  const handleSelectField = (field: keyof Person, value: string) => {
    setMergedFields((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleKeepChange = (id: string) => {
    setKeepId(id);
    setDeleteId(id === selectedPair!.personA.id ? selectedPair!.personB.id : selectedPair!.personA.id);
  };

  const executeMerge = async () => {
    if (!selectedPair) return;
    setMerging(true);
    setError("");
    
    try {
      const response = await fetch("/api/people/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keepId,
          deleteId,
          mergedFields,
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setMergeSuccess(true);
        // Refresh duplicates list
        await fetchDuplicates();
        setTimeout(() => {
          setSelectedPair(null);
        }, 1500);
      } else {
        setError(data.error || "Une erreur est survenue lors de la fusion.");
      }
    } catch (err) {
      console.error(err);
      setError("Erreur réseau lors de la fusion.");
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
        <div className="pulsate" style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
        <p>Analyse de votre arbre généalogique en cours...</p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
          Recherche de profils similaires avec des dates et prénoms compatibles.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", animation: "fadeIn 0.4s ease-out" }}>
      {/* Title Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="title-font" style={{ fontSize: "2.2rem", fontWeight: 800, margin: 0, color: "var(--accent-gold)" }}>
            ⚠️ Gestion des Doublons
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Détectez et fusionnez les individus identiques pour conserver un arbre propre et rigoureux.
          </p>
        </div>
        <button onClick={() => router.push("/people")} className="btn btn-secondary" style={{ borderRadius: "8px" }}>
          🔙 Retour à l'Annuaire
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "hsl(0, 85%, 75%)",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "2rem",
            fontSize: "0.95rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {!selectedPair ? (
        <>
          {duplicates.length === 0 ? (
            <div className="card glass" style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
              <span style={{ fontSize: "4rem", display: "block", marginBottom: "1.5rem" }}>✅</span>
              <h2 className="title-font" style={{ color: "var(--text-primary)", fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                Aucun doublon détecté
              </h2>
              <p>Votre arbre généalogique est parfaitement propre ! Tous les profils semblent uniques.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ fontSize: "1.1rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                💡 Nous avons détecté <strong>{duplicates.length} paire{duplicates.length > 1 ? "s" : ""} de doublons potentiels</strong> dans votre arbre :
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
                {duplicates.map((pair) => {
                  const pA = pair.personA;
                  const pB = pair.personB;
                  return (
                    <div key={pair.id} className="card glass" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                      
                      {/* Top Header info */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{
                            background: pair.score >= 80 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            border: pair.score >= 80 ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
                            color: pair.score >= 80 ? "hsl(142, 70%, 75%)" : "hsl(35, 90%, 70%)",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "12px",
                            fontSize: "0.8rem",
                            fontWeight: 600
                          }}>
                            Probabilité : {pair.score}%
                          </span>
                        </div>
                        <button
                          onClick={() => startMerge(pair)}
                          className="btn btn-accent"
                          style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem", borderRadius: "8px" }}
                        >
                          ⚖️ Comparer & Fusionner
                        </button>
                      </div>

                      {/* Comparison Columns layout */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 50px 1fr", gap: "1rem", alignItems: "center" }}>
                        {/* Profile A */}
                        <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                          <h3 className="title-font" style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                            {pA.firstName} {pA.lastName.toUpperCase()}
                          </h3>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <div>📅 Naissance : {pA.birthDate || "Inconnue"}{pA.birthPlace ? ` (${pA.birthPlace})` : ""}</div>
                            <div>💀 Décès : {pA.deathDate || "Inconnu"}{pA.deathPlace ? ` (${pA.deathPlace})` : ""}</div>
                            {pA.occupation && <div>💼 Métier : {pA.occupation}</div>}
                          </div>
                        </div>

                        {/* VS Label */}
                        <div style={{ textAlign: "center", color: "var(--text-muted)", fontWeight: "bold", fontSize: "1.1rem" }}>
                          VS
                        </div>

                        {/* Profile B */}
                        <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                          <h3 className="title-font" style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                            {pB.firstName} {pB.lastName.toUpperCase()}
                          </h3>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <div>📅 Naissance : {pB.birthDate || "Inconnue"}{pB.birthPlace ? ` (${pB.birthPlace})` : ""}</div>
                            <div>💀 Décès : {pB.deathDate || "Inconnu"}{pB.deathPlace ? ` (${pB.deathPlace})` : ""}</div>
                            {pB.occupation && <div>💼 Métier : {pB.occupation}</div>}
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Detailed Smart Merge Screen */
        <div className="card glass animate-fadeIn" style={{ padding: "2rem" }}>
          {mergeSuccess ? (
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <span style={{ fontSize: "4rem", display: "block", animation: "pulse 1.5s infinite" }}>✨</span>
              <h2 className="title-font" style={{ color: "var(--accent-gold)", fontSize: "1.8rem", marginTop: "1rem" }}>
                Fusion réussie !
              </h2>
              <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                Les profils ont été fusionnés de manière sécurisée en base de données.
              </p>
            </div>
          ) : (
            <>
              {/* Header inside Merge Panel */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem", marginBottom: "2rem" }}>
                <div>
                  <h2 className="title-font" style={{ fontSize: "1.6rem", fontWeight: 700 }}>
                    ⚖️ Fusion Côte-à-Côte
                  </h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    Sélectionnez la meilleure valeur pour chaque champ en cliquant sur les cases de gauche ou de droite. Vous pouvez également éditer le résultat final directement au centre.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPair(null)}
                  className="btn btn-secondary"
                  style={{ borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.9rem" }}
                >
                  Annuler
                </button>
              </div>

              {/* Main Selector of Profile to Keep */}
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.25rem", borderRadius: "12px", border: "1px dashed var(--border-subtle)", marginBottom: "2rem" }}>
                <h3 className="title-font" style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--accent-gold)", marginBottom: "0.75rem" }}>
                  👤 Quel profil principal conserver ?
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  Le profil non sélectionné sera supprimé, mais tous ses enfants, parents, unions et médias seront rattachés au profil conservé.
                </p>
                <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "1rem", fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="keepProfile"
                      checked={keepId === selectedPair.personA.id}
                      onChange={() => handleKeepChange(selectedPair.personA.id)}
                      style={{ transform: "scale(1.2)", accentColor: "var(--accent-emerald)" }}
                    />
                    <span>Profil A : {selectedPair.personA.firstName} {selectedPair.personA.lastName.toUpperCase()}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>({countFilledFields(selectedPair.personA)} champs remplis)</span>
                  </label>
                  
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "1rem", fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="keepProfile"
                      checked={keepId === selectedPair.personB.id}
                      onChange={() => handleKeepChange(selectedPair.personB.id)}
                      style={{ transform: "scale(1.2)", accentColor: "var(--accent-emerald)" }}
                    />
                    <span>Profil B : {selectedPair.personB.firstName} {selectedPair.personB.lastName.toUpperCase()}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>({countFilledFields(selectedPair.personB)} champs remplis)</span>
                  </label>
                </div>
              </div>

              {/* 3-Column Merge Field Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2.5rem" }}>
                
                {/* Headers of the grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "1rem", fontWeight: 700, fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase", paddingBottom: "0.5rem", borderBottom: "2px solid var(--border-subtle)" }}>
                  <div>Profil A</div>
                  <div style={{ textAlign: "center", color: "var(--accent-gold)" }}>Valeur Fusionnée Finale</div>
                  <div style={{ textAlign: "right" }}>Profil B</div>
                </div>

                {/* Comparative row builder */}
                {[
                  { label: "Prénom", key: "firstName" as const },
                  { label: "Nom de Famille", key: "lastName" as const },
                  { label: "Nom de Naissance", key: "birthName" as const },
                  { label: "Genre (M/F/U)", key: "gender" as const },
                  { label: "Date de Naissance", key: "birthDate" as const },
                  { label: "Lieu de Naissance", key: "birthPlace" as const },
                  { label: "Date de Baptême", key: "baptismDate" as const },
                  { label: "Lieu de Baptême", key: "baptismPlace" as const },
                  { label: "Date de Décès", key: "deathDate" as const },
                  { label: "Lieu de Décès", key: "deathPlace" as const },
                  { label: "Date d'Inhumation", key: "burialDate" as const },
                  { label: "Lieu d'Inhumation", key: "burialPlace" as const },
                  { label: "Profession", key: "occupation" as const },
                  { label: "Notes", key: "notes" as const, textarea: true },
                  { label: "Sources", key: "sources" as const, textarea: true },
                ].map((field) => {
                  const valA = selectedPair.personA[field.key] || "";
                  const valB = selectedPair.personB[field.key] || "";
                  const currentVal = mergedFields[field.key] || "";

                  const isSelectedA = currentVal === valA && valA !== "";
                  const isSelectedB = currentVal === valB && valB !== "";

                  return (
                    <div
                      key={field.key}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1.2fr 1fr",
                        gap: "1rem",
                        alignItems: field.textarea ? "stretch" : "center",
                        padding: "0.75rem 0",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      {/* Button Option A */}
                      <div>
                        <button
                          type="button"
                          onClick={() => handleSelectField(field.key, valA)}
                          disabled={!valA}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "0.6rem 0.9rem",
                            borderRadius: "8px",
                            background: isSelectedA ? "rgba(16, 185, 129, 0.15)" : valA ? "rgba(255, 255, 255, 0.02)" : "transparent",
                            border: isSelectedA ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--border-subtle)",
                            color: isSelectedA ? "hsl(142, 70%, 75%)" : valA ? "var(--text-primary)" : "var(--text-muted)",
                            cursor: valA ? "pointer" : "default",
                            fontSize: "0.9rem",
                          }}
                        >
                          <span style={{ fontSize: "0.75rem", display: "block", color: "var(--text-muted)", marginBottom: "0.15rem" }}>
                            {field.label}
                          </span>
                          <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: field.textarea ? "normal" : "nowrap", display: "block" }}>
                            {valA || "—"}
                          </span>
                        </button>
                      </div>

                      {/* Edit Center Box */}
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        {field.textarea ? (
                          <textarea
                            className="input-field"
                            rows={3}
                            value={currentVal}
                            onChange={(e) => handleSelectField(field.key, e.target.value)}
                            style={{ fontSize: "0.9rem", width: "100%", resize: "vertical" }}
                          />
                        ) : (
                          <input
                            type="text"
                            className="input-field"
                            value={currentVal}
                            onChange={(e) => handleSelectField(field.key, e.target.value)}
                            style={{ fontSize: "0.9rem", width: "100%", textAlign: "center", fontWeight: "bold" }}
                          />
                        )}
                      </div>

                      {/* Button Option B */}
                      <div>
                        <button
                          type="button"
                          onClick={() => handleSelectField(field.key, valB)}
                          disabled={!valB}
                          style={{
                            width: "100%",
                            textAlign: "right",
                            padding: "0.6rem 0.9rem",
                            borderRadius: "8px",
                            background: isSelectedB ? "rgba(16, 185, 129, 0.15)" : valB ? "rgba(255, 255, 255, 0.02)" : "transparent",
                            border: isSelectedB ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--border-subtle)",
                            color: isSelectedB ? "hsl(142, 70%, 75%)" : valB ? "var(--text-primary)" : "var(--text-muted)",
                            cursor: valB ? "pointer" : "default",
                            fontSize: "0.9rem",
                          }}
                        >
                          <span style={{ fontSize: "0.75rem", display: "block", color: "var(--text-muted)", marginBottom: "0.15rem" }}>
                            {field.label}
                          </span>
                          <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: field.textarea ? "normal" : "nowrap", display: "block" }}>
                            {valB || "—"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons for Merging */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setSelectedPair(null)}
                  className="btn btn-secondary"
                  style={{ borderRadius: "8px" }}
                  disabled={merging}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={executeMerge}
                  className="btn btn-primary"
                  style={{ borderRadius: "8px", padding: "0.75rem 2rem", fontSize: "1.05rem" }}
                  disabled={merging}
                >
                  {merging ? "Fusion en cours..." : "✨ Valider la Fusion"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
