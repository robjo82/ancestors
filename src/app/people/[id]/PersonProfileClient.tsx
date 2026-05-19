"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseDate } from "../../../utils/dateParser";
import { checkPersonConsistency } from "../../../utils/consistency";
import { computeSosaNumbering, computeAbovilleNumbering, computePelissierNumbering } from "../../../utils/numbering";

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
  avatarUrl: string | null;
  sources?: string | null;
  fatherId: string | null;
  motherId: string | null;
  father?: Person | null;
  mother?: Person | null;
  media?: Media[];
}

interface Media {
  id: string;
  url: string;
  title: string;
  type: string;
  date: string | null;
  description: string | null;
}

interface Union {
  id: string;
  type: string;
  weddingDate: string | null;
  weddingPlace: string | null;
  divorceDate: string | null;
  isDivorced: boolean;
  notes: string | null;
  partner: {
    id: string;
    firstName: string;
    lastName: string;
    gender: string;
    birthDate: string | null;
  };
}

interface PeopleOption {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string | null;
  fatherId?: string | null;
  motherId?: string | null;
}

interface PersonProfileClientProps {
  person: Person;
  unions: Union[];
  children: Person[];
  allPeople: PeopleOption[];
  potentialFathers: PeopleOption[];
  potentialMothers: PeopleOption[];
  consistencyWarnings?: any[];
}

export default function PersonProfileClient({
  person,
  unions,
  children,
  allPeople,
  potentialFathers,
  potentialMothers,
  consistencyWarnings = [],
}: PersonProfileClientProps) {
  const router = useRouter();
  
  // Navigation par onglets
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "media" | "relations" | "search">("overview");
  
  // États d'édition
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(person.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  const [isEditingSources, setIsEditingSources] = useState(false);
  const [editedSources, setEditedSources] = useState(person.sources || "");
  const [savingSources, setSavingSources] = useState(false);

  const [isEditingFiliation, setIsEditingFiliation] = useState(false);
  const [selectedFatherId, setSelectedFatherId] = useState(person.fatherId || "");
  const [selectedMotherId, setSelectedMotherId] = useState(person.motherId || "");
  const [savingFiliation, setSavingFiliation] = useState(false);

  // État d'ajout d'union
  const [isAddingUnion, setIsAddingUnion] = useState(false);
  const [newUnionData, setNewUnionData] = useState({
    partner2Id: "",
    type: "MARRIAGE",
    weddingDate: "",
    weddingPlace: "",
    isDivorced: false,
    notes: "",
  });
  const [savingUnion, setSavingUnion] = useState(false);

  // État de téléversement de média
  const [uploadData, setUploadData] = useState({
    title: "",
    type: "PHOTO",
    description: "",
    date: "",
    setAvatar: false,
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // État de recherche MatchID (INSEE)
  const [matchIdResults, setMatchIdResults] = useState<any[]>([]);
  const [searchingMatchId, setSearchingMatchId] = useState(false);
  const [searchError, setSearchError] = useState("");

  // État d'édition d'état civil complet
  const [isEditingCivic, setIsEditingCivic] = useState(false);
  const [civicData, setCivicData] = useState({
    firstName: person.firstName,
    lastName: person.lastName,
    birthName: person.birthName || "",
    gender: person.gender,
    occupation: person.occupation || "",
    birthDate: person.birthDate || "",
    birthPlace: person.birthPlace || "",
    baptismDate: person.baptismDate || "",
    baptismPlace: person.baptismPlace || "",
    deathDate: person.deathDate || "",
    deathPlace: person.deathPlace || "",
    burialDate: person.burialDate || "",
    burialPlace: person.burialPlace || "",
  });
  const [savingCivic, setSavingCivic] = useState(false);

  // État des numérotations
  const [deCujusId, setDeCujusId] = useState<string>("");
  const [descendanceRootId, setDescendanceRootId] = useState<string>("");

  useEffect(() => {
    const savedDeCujus = localStorage.getItem("ancestors_sosa_de_cujus_id") || person.id;
    const savedRoot = localStorage.getItem("ancestors_descendance_root_id") || person.id;
    setDeCujusId(savedDeCujus);
    setDescendanceRootId(savedRoot);
  }, [person.id]);

  const allPeopleWithSelf = [
    ...allPeople,
    {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      gender: person.gender,
      birthDate: person.birthDate,
      fatherId: person.fatherId,
      motherId: person.motherId,
    }
  ];

  const deCujusPerson = allPeopleWithSelf.find(p => p.id === deCujusId);
  const rootPerson = allPeopleWithSelf.find(p => p.id === descendanceRootId);

  const peopleMinimal = allPeopleWithSelf.map(p => ({
    id: p.id,
    fatherId: p.fatherId ?? null,
    motherId: p.motherId ?? null,
    birthDate: p.birthDate ?? null,
  }));

  // Calcul Sosa
  let mySosaNumbers: number[] = [];
  if (deCujusId) {
    const sosaMap = computeSosaNumbering(peopleMinimal, deCujusId);
    mySosaNumbers = sosaMap[person.id] || [];
  }

  // Calcul Aboville / Pélissier
  let myAboville: string | null = null;
  let myPelissier: string | null = null;
  if (descendanceRootId) {
    const abovilleMap = computeAbovilleNumbering(peopleMinimal, descendanceRootId);
    const pelissierMap = computePelissierNumbering(peopleMinimal, descendanceRootId);
    myAboville = abovilleMap[person.id] || null;
    myPelissier = pelissierMap[person.id] || null;
  }

  const birthYear = person.birthDate ? person.birthDate.match(/\d{4}/)?.[0] || "" : "";

  // Lancement automatique de la recherche MatchID à l'affichage de l'onglet
  useEffect(() => {
    if (activeTab === "search" && matchIdResults.length === 0) {
      triggerMatchIdSearch();
    }
  }, [activeTab]);

  const triggerMatchIdSearch = async () => {
    setSearchingMatchId(true);
    setSearchError("");
    try {
      const response = await fetch(`/api/search?firstName=${encodeURIComponent(person.firstName)}&lastName=${encodeURIComponent(person.lastName)}&birthYear=${birthYear}`);
      if (response.ok) {
        const data = await response.json();
        setMatchIdResults(data);
      } else {
        setSearchError("Impossible d'obtenir les résultats de l'API MatchID.");
      }
    } catch (e) {
      setSearchError("Erreur de connexion avec le proxy de recherche.");
    } finally {
      setSearchingMatchId(false);
    }
  };

  const applyMatchIdInfo = async (result: any) => {
    if (!confirm(`Voulez-vous importer la date de décès (${result.deathDate}) et le lieu (${result.deathPlace}) dans le profil de ${person.firstName} ?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/people/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: person.firstName,
          lastName: person.lastName,
          gender: person.gender,
          deathDate: result.deathDate,
          deathPlace: result.deathPlace,
        }),
      });
      
      if (response.ok) {
        alert("Profil mis à jour avec les informations de l'INSEE !");
        router.refresh();
      } else {
        alert("Erreur lors de la mise à jour.");
      }
    } catch (e) {
      alert("Erreur de communication avec le serveur.");
    }
  };

  const handleCivicSave = async () => {
    setSavingCivic(true);
    try {
      const response = await fetch(`/api/people/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(civicData),
      });

      if (response.ok) {
        setIsEditingCivic(false);
        router.refresh();
      } else {
        const d = await response.json();
        alert(d.error || "Erreur lors de la modification de l'état civil.");
      }
    } catch (e) {
      alert("Erreur réseau.");
    } finally {
      setSavingCivic(false);
    }
  };

  const getMonthName = (m: number): string => {
    const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    return months[m - 1] || "";
  };

  const renderDateFeedback = (dateStr: string) => {
    if (!dateStr) return null;
    const parsed = parseDate(dateStr);
    if (parsed.year) {
      const monthStr = parsed.month ? ` ${getMonthName(parsed.month)}` : "";
      const dayStr = parsed.day ? ` ${parsed.day}` : "";
      const approxStr = parsed.isApproximate ? "vers " : parsed.isBefore ? "avant " : parsed.isAfter ? "après " : "";
      return (
        <span style={{ fontSize: "0.8rem", color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.25rem" }}>
          🟢 Reconnu : {approxStr}{dayStr}{monthStr} {parsed.year}
        </span>
      );
    } else {
      return (
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.25rem" }}>
          ⚠️ Date non reconnue (texte brut simple)
        </span>
      );
    }
  };

  const renderDraftConsistencyWarnings = () => {
    const unionsForConsistency = unions.map((u: any) => ({
      id: u.id,
      weddingDate: u.weddingDate,
      partnerId: u.partner?.id || "",
      partnerName: u.partner ? `${u.partner.firstName} ${u.partner.lastName}` : "Conjoint inconnu"
    }));

    const childrenForConsistency = children.map((c: any) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      birthDate: c.birthDate
    }));

    const draftWarnings = checkPersonConsistency(
      {
        id: person.id,
        firstName: civicData.firstName,
        lastName: civicData.lastName,
        gender: civicData.gender,
        birthDate: civicData.birthDate || null,
        deathDate: civicData.deathDate || null,
        fatherId: person.fatherId,
        motherId: person.motherId,
        father: person.father,
        mother: person.mother,
      },
      unionsForConsistency,
      childrenForConsistency
    );

    if (draftWarnings.length === 0) return null;

    return (
      <div style={{ 
        padding: "0.75rem", 
        border: "1px solid rgba(239, 68, 68, 0.2)", 
        background: "rgba(239, 68, 68, 0.05)",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        marginTop: "0.5rem"
      }}>
        <strong style={{ fontSize: "0.85rem", color: "#f87171" }}>⚠️ Incohérences détectées (en temps réel) :</strong>
        {draftWarnings.map((w, i) => (
          <span key={i} style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            • {w.message}
          </span>
        ))}
      </div>
    );
  };

  const handleNotesSave = async () => {
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/people/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: person.firstName,
          lastName: person.lastName,
          gender: person.gender,
          notes: editedNotes,
        }),
      });

      if (response.ok) {
        setIsEditingNotes(false);
        router.refresh();
      } else {
        alert("Erreur lors de l'enregistrement des notes.");
      }
    } catch (err) {
      alert("Erreur réseau.");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSourcesSave = async () => {
    setSavingSources(true);
    try {
      const response = await fetch(`/api/people/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: person.firstName,
          lastName: person.lastName,
          gender: person.gender,
          sources: editedSources,
        }),
      });

      if (response.ok) {
        setIsEditingSources(false);
        router.refresh();
      } else {
        alert("Erreur lors de l'enregistrement des sources.");
      }
    } catch (err) {
      alert("Erreur réseau.");
    } finally {
      setSavingSources(false);
    }
  };

  const handleFiliationSave = async () => {
    setSavingFiliation(true);
    try {
      const response = await fetch(`/api/people/${person.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: person.firstName,
          lastName: person.lastName,
          gender: person.gender,
          fatherId: selectedFatherId || null,
          motherId: selectedMotherId || null,
        }),
      });

      if (response.ok) {
        setIsEditingFiliation(false);
        router.refresh();
      } else {
        alert("Erreur lors de l'enregistrement de la filiation.");
      }
    } catch (err) {
      alert("Erreur réseau.");
    } finally {
      setSavingFiliation(false);
    }
  };

  const handleAddUnionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnionData.partner2Id) return;

    setSavingUnion(true);
    try {
      const response = await fetch("/api/unions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner1Id: person.id,
          partner2Id: newUnionData.partner2Id,
          type: newUnionData.type,
          weddingDate: newUnionData.weddingDate,
          weddingPlace: newUnionData.weddingPlace,
          isDivorced: newUnionData.isDivorced,
          notes: newUnionData.notes,
        }),
      });

      if (response.ok) {
        setIsAddingUnion(false);
        setNewUnionData({
          partner2Id: "",
          type: "MARRIAGE",
          weddingDate: "",
          weddingPlace: "",
          isDivorced: false,
          notes: "",
        });
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Erreur de création de l'union.");
      }
    } catch (err) {
      alert("Erreur réseau.");
    } finally {
      setSavingUnion(false);
    }
  };

  const handleMediaUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaFile) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append("file", mediaFile);
    formData.append("personId", person.id);
    formData.append("title", uploadData.title || mediaFile.name);
    formData.append("type", uploadData.type);
    formData.append("description", uploadData.description);
    formData.append("date", uploadData.date);
    formData.append("setAvatar", uploadData.setAvatar ? "true" : "false");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setMediaFile(null);
        setUploadData({
          title: "",
          type: "PHOTO",
          description: "",
          date: "",
          setAvatar: false,
        });
        alert("Fichier téléversé avec succès !");
        router.refresh();
      } else {
        alert("Erreur lors du téléversement.");
      }
    } catch (err) {
      alert("Erreur de connexion.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDeletePerson = async () => {
    if (confirm(`⚠️ Êtes-vous sûr de vouloir supprimer définitivement ${person.firstName} ${person.lastName?.toUpperCase()} ? Toutes ses relations d'union seront également supprimées.`)) {
      try {
        const response = await fetch(`/api/people/${person.id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          router.push("/people");
          router.refresh();
        } else {
          alert("Erreur de suppression.");
        }
      } catch (e) {
        alert("Erreur réseau.");
      }
    }
  };

  // Icône par défaut selon le sexe
  const defaultAvatarStyle = {
    width: "120px",
    height: "120px",
    borderRadius: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "3rem",
    background: person.gender === "M" ? "radial-gradient(circle, #2563eb, #1e3a8a)" : 
                person.gender === "F" ? "radial-gradient(circle, #db2777, #831843)" : 
                "radial-gradient(circle, #4b5563, #111827)",
    border: "3px solid var(--border-subtle)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* En-tête du Profil */}
      <section className="glass" style={{ padding: "2rem", display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap", position: "relative" }}>
        
        {/* Avatar */}
        <div>
          {person.avatarUrl ? (
            <img 
              src={person.avatarUrl} 
              alt={person.firstName} 
              style={{ width: "120px", height: "120px", borderRadius: "60px", objectFit: "cover", border: "3px solid var(--accent-gold)" }}
            />
          ) : (
            <div style={defaultAvatarStyle}>
              {person.gender === "M" ? "👨‍🦳" : person.gender === "F" ? "👩‍🦳" : "👤"}
            </div>
          )}
        </div>

        {/* Détails identité */}
        <div style={{ flex: 1, minWidth: "250px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h1 className="title-font" style={{ fontSize: "2.2rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
              {person.firstName} {person.lastName?.toUpperCase()}
            </h1>
            <span style={{ fontSize: "1.5rem" }}>{person.gender === "M" ? "♂" : person.gender === "F" ? "♀" : "❓"}</span>
          </div>

          {person.birthName && (
            <span style={{ color: "var(--text-muted)", fontSize: "1.1rem", display: "block", marginTop: "-0.2rem" }}>
              Née <strong>{person.birthName.toUpperCase()}</strong>
            </span>
          )}

          <div style={{ color: "var(--accent-gold)", fontSize: "1.1rem", fontWeight: 600, marginTop: "0.5rem" }}>
            📅 {person.birthDate ? person.birthDate.substring(0, 4) : "????"} - {person.deathDate ? person.deathDate.substring(0, 4) : "Vivant"}
          </div>

          <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
            💼 {person.occupation || "Sans profession renseignée"}
          </div>
        </div>

        {/* Actions de suppression / retour */}
        <div style={{ display: "flex", gap: "0.75rem", alignSelf: "flex-start" }} className="profile-actions">
          <a href="/people" className="btn btn-secondary" style={{ padding: "0.5rem 1rem" }}>
            ◀ Annuaire
          </a>
          <button 
            onClick={() => window.print()} 
            className="btn btn-accent"
            style={{ padding: "0.5rem 1rem", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
          >
            🖨️ Imprimer la Fiche
          </button>
          <button 
            onClick={handleDeletePerson} 
            className="btn btn-danger"
            style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
          >
            🗑️ Supprimer
          </button>
        </div>
      </section>

      {/* Barre d'onglets */}
      <section className="glass no-print" style={{ padding: "0.25rem", borderRadius: "10px" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button 
            onClick={() => setActiveTab("overview")}
            className={`navbar-link ${activeTab === "overview" ? "active" : ""}`}
            style={{ flex: 1, textAlign: "center", border: "none" }}
          >
            📊 Vue d'Ensemble
          </button>
          <button 
            onClick={() => setActiveTab("timeline")}
            className={`navbar-link ${activeTab === "timeline" ? "active" : ""}`}
            style={{ flex: 1, textAlign: "center", border: "none" }}
          >
            ⏱️ Vie & Chronologie
          </button>
          <button 
            onClick={() => setActiveTab("relations")}
            className={`navbar-link ${activeTab === "relations" ? "active" : ""}`}
            style={{ flex: 1, textAlign: "center", border: "none" }}
          >
            🌿 Relations & Conjoints
          </button>
          <button 
            onClick={() => setActiveTab("media")}
            className={`navbar-link ${activeTab === "media" ? "active" : ""}`}
            style={{ flex: 1, textAlign: "center", border: "none" }}
          >
            🖼️ Photos & Médias
          </button>
          <button 
            onClick={() => setActiveTab("search")}
            className={`navbar-link ${activeTab === "search" ? "active" : ""}`}
            style={{ flex: 1, textAlign: "center", border: "none" }}
          >
            🔎 Recherche INSEE / Web
          </button>
        </div>
      </section>

      {/* Contenu de l'onglet actif */}
      <div style={{ minHeight: "300px" }} className="profile-tabs-content">
        
        {/* 1. Onglet Vue d'Ensemble (Overview) */}
        <div className={`tab-pane ${activeTab === "overview" ? "active" : ""}`}>
          
          {/* Panneau d'alertes de cohérence chronologique */}
          {consistencyWarnings && consistencyWarnings.length > 0 && (
            <div className="glass" style={{ 
              padding: "1.5rem", 
              marginBottom: "2rem", 
              border: "1px solid rgba(239, 68, 68, 0.25)", 
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02))",
              borderRadius: "16px",
              boxShadow: "0 8px 32px rgba(239, 68, 68, 0.05)",
            }}>
              <h3 className="title-font" style={{ fontSize: "1.25rem", color: "#f87171", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span className="pulsate" style={{ fontSize: "1.4rem" }}>⚠️</span> Anomalies Chronologiques Détectées ({consistencyWarnings.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {consistencyWarnings.map((warning: any, idx: number) => (
                  <div key={idx} style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between", 
                    padding: "0.75rem 1rem", 
                    background: "rgba(15, 25, 18, 0.4)", 
                    borderRadius: "8px", 
                    borderLeft: warning.severity === "error" ? "4px solid #ef4444" : "4px solid #fbbf24",
                  }}>
                    <span style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>{warning.message}</span>
                    <span style={{ 
                      fontSize: "0.75rem", 
                      fontWeight: 700, 
                      padding: "0.2rem 0.5rem", 
                      borderRadius: "4px", 
                      textTransform: "uppercase",
                      background: warning.severity === "error" ? "rgba(239, 68, 68, 0.2)" : "rgba(251, 191, 36, 0.2)",
                      color: warning.severity === "error" ? "#f87171" : "#fbbf24",
                    }}>
                      {warning.severity === "error" ? "Erreur" : "Alerte"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "2rem" }} className="overview-layout">
            
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              {/* Notes / Biographie */}
              <div className="card glass" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className="title-font" style={{ fontSize: "1.3rem", color: "var(--accent-gold)" }}>
                    📝 Biographie & Notes
                  </h3>
                  {!isEditingNotes ? (
                    <button onClick={() => setIsEditingNotes(true)} className="btn btn-secondary no-print" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                      Modifier
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: "0.5rem" }} className="no-print">
                      <button onClick={handleNotesSave} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }} disabled={savingNotes}>
                        {savingNotes ? "Sauvegarde..." : "Enregistrer"}
                      </button>
                      <button onClick={() => { setIsEditingNotes(false); setEditedNotes(person.notes || ""); }} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                        Annuler
                      </button>
                    </div>
                  )}
                </div>

                {isEditingNotes ? (
                  <textarea 
                    value={editedNotes} 
                    onChange={(e) => setEditedNotes(e.target.value)} 
                    className="input-field"
                    style={{ minHeight: "200px", resize: "vertical" }}
                  />
                ) : (
                  <div style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                    {person.notes || "Aucune note biographique n'a été rédigée sur cette personne pour le moment."}
                  </div>
                )}
              </div>

              {/* Sources & Archives */}
              <div className="card glass" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className="title-font" style={{ fontSize: "1.3rem", color: "var(--accent-gold)" }}>
                    📚 Sources & Références d'Archives
                  </h3>
                  {!isEditingSources ? (
                    <button onClick={() => setIsEditingSources(true)} className="btn btn-secondary no-print" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                      Modifier
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: "0.5rem" }} className="no-print">
                      <button onClick={handleSourcesSave} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }} disabled={savingSources}>
                        {savingSources ? "Sauvegarde..." : "Enregistrer"}
                      </button>
                      <button onClick={() => { setIsEditingSources(false); setEditedSources(person.sources || ""); }} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                        Annuler
                      </button>
                    </div>
                  )}
                </div>

                {isEditingSources ? (
                  <textarea 
                    value={editedSources} 
                    onChange={(e) => setEditedSources(e.target.value)} 
                    className="input-field"
                    placeholder="Ex: Acte de naissance : AD Lyon, Registre 1892, p.45. Lien : http://archives.rhone.fr/..."
                    style={{ minHeight: "150px", resize: "vertical" }}
                  />
                ) : (
                  <div style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                    {person.sources || "Aucune source ni référence d'archive n'a encore été ajoutée pour cet individu."}
                  </div>
                )}
              </div>
            </div>

            {/* Colonne de droite */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              
              {/* Fiche d'état civil rapide */}
              <div className="card glass civic-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className="title-font" style={{ fontSize: "1.3rem", color: "var(--accent-gold)" }}>
                    📁 État Civil Renseigné
                  </h3>
                  {!isEditingCivic ? (
                    <button onClick={() => setIsEditingCivic(true)} className="btn btn-secondary no-print" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                      Modifier
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: "0.5rem" }} className="no-print">
                      <button onClick={handleCivicSave} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }} disabled={savingCivic}>
                        {savingCivic ? "Sauvegarde..." : "Enregistrer"}
                      </button>
                      <button onClick={() => { setIsEditingCivic(false); setCivicData({
                        firstName: person.firstName,
                        lastName: person.lastName,
                        birthName: person.birthName || "",
                        gender: person.gender,
                        occupation: person.occupation || "",
                        birthDate: person.birthDate || "",
                        birthPlace: person.birthPlace || "",
                        baptismDate: person.baptismDate || "",
                        baptismPlace: person.baptismPlace || "",
                        deathDate: person.deathDate || "",
                        deathPlace: person.deathPlace || "",
                        burialDate: person.burialDate || "",
                        burialPlace: person.burialPlace || "",
                      }); }} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
                
                {!isEditingCivic ? (
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.95rem" }}>
                    <li>👶 **Naissance :** {person.birthDate || "Inconnue"} {person.birthPlace ? `à ${person.birthPlace}` : ""}</li>
                    {person.baptismDate && <li>👼 **Baptême :** {person.baptismDate} {person.baptismPlace ? `à ${person.baptismPlace}` : ""}</li>}
                    <li>💀 **Décès :** {person.deathDate || "Vivant (ou inconnu)"} {person.deathPlace ? `à ${person.deathPlace}` : ""}</li>
                    {person.burialDate && <li>⚰️ **Inhumation :** {person.burialDate} {person.burialPlace ? `à ${person.burialPlace}` : ""}</li>}
                  </ul>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }} className="no-print">
                    <div className="input-group">
                      <label className="input-label">Prénom</label>
                      <input type="text" className="input-field" value={civicData.firstName} onChange={e => setCivicData({...civicData, firstName: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Nom</label>
                      <input type="text" className="input-field" value={civicData.lastName} onChange={e => setCivicData({...civicData, lastName: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Nom de naissance</label>
                      <input type="text" className="input-field" value={civicData.birthName} onChange={e => setCivicData({...civicData, birthName: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Sexe</label>
                      <select className="input-field" value={civicData.gender} onChange={e => setCivicData({...civicData, gender: e.target.value})}>
                        <option value="M">Homme ♂</option>
                        <option value="F">Femme ♀</option>
                        <option value="U">Inconnu ❓</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Profession</label>
                      <input type="text" className="input-field" value={civicData.occupation} onChange={e => setCivicData({...civicData, occupation: e.target.value})} />
                    </div>

                    <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: "0.5rem 0" }} />

                    <div className="input-group">
                      <label className="input-label">Date de Naissance</label>
                      <input type="text" className="input-field" value={civicData.birthDate} onChange={e => setCivicData({...civicData, birthDate: e.target.value})} placeholder="ex: vers 1750, 15 mai 1812" />
                      {renderDateFeedback(civicData.birthDate)}
                    </div>
                    <div className="input-group">
                      <label className="input-label">Lieu de Naissance</label>
                      <input type="text" className="input-field" value={civicData.birthPlace} onChange={e => setCivicData({...civicData, birthPlace: e.target.value})} />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Date de Baptême</label>
                      <input type="text" className="input-field" value={civicData.baptismDate} onChange={e => setCivicData({...civicData, baptismDate: e.target.value})} placeholder="ex: 16 mai 1812" />
                      {renderDateFeedback(civicData.baptismDate)}
                    </div>
                    <div className="input-group">
                      <label className="input-label">Lieu de Baptême</label>
                      <input type="text" className="input-field" value={civicData.baptismPlace} onChange={e => setCivicData({...civicData, baptismPlace: e.target.value})} />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Date de Décès</label>
                      <input type="text" className="input-field" value={civicData.deathDate} onChange={e => setCivicData({...civicData, deathDate: e.target.value})} placeholder="ex: après 1890, 20 oct 1888" />
                      {renderDateFeedback(civicData.deathDate)}
                    </div>
                    <div className="input-group">
                      <label className="input-label">Lieu de Décès</label>
                      <input type="text" className="input-field" value={civicData.deathPlace} onChange={e => setCivicData({...civicData, deathPlace: e.target.value})} />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Date d'Inhumation</label>
                      <input type="text" className="input-field" value={civicData.burialDate} onChange={e => setCivicData({...civicData, burialDate: e.target.value})} />
                      {renderDateFeedback(civicData.burialDate)}
                    </div>
                    <div className="input-group">
                      <label className="input-label">Lieu d'Inhumation</label>
                      <input type="text" className="input-field" value={civicData.burialPlace} onChange={e => setCivicData({...civicData, burialPlace: e.target.value})} />
                    </div>

                    {renderDraftConsistencyWarnings()}
                  </div>
                )}
              </div>

              {/* Numérotation Généalogique */}
              <div className="card glass" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <h3 className="title-font" style={{ fontSize: "1.3rem", color: "var(--accent-gold)" }}>
                  🌿 Numérotations Généalogiques
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* Sosa */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>SOSA-STRADONITZ</span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                        De Cujus: <span style={{ color: "var(--text-primary)" }}>{deCujusPerson ? `${deCujusPerson.firstName} ${deCujusPerson.lastName}` : "Lui-même"}</span>
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: "0.95rem", 
                      fontWeight: 800, 
                      padding: "0.3rem 0.6rem", 
                      borderRadius: "6px", 
                      background: mySosaNumbers.length > 0 ? "var(--accent-gold-glow)" : "rgba(255, 255, 255, 0.05)",
                      color: mySosaNumbers.length > 0 ? "var(--accent-gold)" : "var(--text-muted)",
                      border: mySosaNumbers.length > 0 ? "1px solid var(--accent-gold)" : "1px solid var(--border-subtle)"
                    }}>
                      {mySosaNumbers.length > 0 ? `N° ${mySosaNumbers.join(", ")}` : "Non défini"}
                    </span>
                  </div>

                  {/* Aboville */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>ABOVILLE (DESCENDANCE)</span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                        Racine: <span style={{ color: "var(--text-primary)" }}>{rootPerson ? `${rootPerson.firstName} ${rootPerson.lastName}` : "Lui-même"}</span>
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: "0.95rem", 
                      fontWeight: 800, 
                      padding: "0.3rem 0.6rem", 
                      borderRadius: "6px", 
                      background: myAboville ? "var(--accent-emerald-glow)" : "rgba(255, 255, 255, 0.05)",
                      color: myAboville ? "var(--accent-emerald)" : "var(--text-muted)",
                      border: myAboville ? "1px solid var(--accent-emerald)" : "1px solid var(--border-subtle)"
                    }}>
                      {myAboville ? `N° ${myAboville}` : "Non défini"}
                    </span>
                  </div>

                  {/* Pélissier */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>PÉLISSIER (DESCENDANCE)</span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                        Racine: <span style={{ color: "var(--text-primary)" }}>{rootPerson ? `${rootPerson.firstName} ${rootPerson.lastName}` : "Lui-même"}</span>
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: "0.95rem", 
                      fontWeight: 800, 
                      padding: "0.3rem 0.6rem", 
                      borderRadius: "6px", 
                      background: myPelissier ? "var(--accent-emerald-glow)" : "rgba(255, 255, 255, 0.05)",
                      color: myPelissier ? "var(--accent-emerald)" : "var(--text-muted)",
                      border: myPelissier ? "1px solid var(--accent-emerald)" : "1px solid var(--border-subtle)"
                    }}>
                      {myPelissier ? `N° ${myPelissier}` : "Non défini"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button 
                    onClick={() => {
                      localStorage.setItem("ancestors_sosa_de_cujus_id", person.id);
                      setDeCujusId(person.id);
                    }}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem", textAlign: "center" }}
                  >
                    🎯 Définir Sosa 1
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.setItem("ancestors_descendance_root_id", person.id);
                      setDescendanceRootId(person.id);
                    }}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem", textAlign: "center" }}
                  >
                    🌱 Définir Racine
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* 2. Onglet Vie & Chronologie */}
        <div className={`tab-pane ${activeTab === "timeline" ? "active" : ""}`}>
          <div className="card glass">
            <h3 className="title-font" style={{ fontSize: "1.4rem", color: "var(--accent-gold)", marginBottom: "1.5rem" }}>
              ⏱️ Ligne de Vie de {person.firstName}
            </h3>

            {/* Timeline vertical */}
            <div style={{ borderLeft: "2px solid var(--accent-emerald)", marginLeft: "1rem", paddingLeft: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem", position: "relative" }}>
              
              {/* Naissance */}
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "-2.6rem", top: "0", background: "var(--bg-primary)", border: "2px solid var(--accent-emerald)", borderRadius: "10px", width: "18px", height: "18px", display: "block" }}></span>
                <strong>👶 Naissance</strong>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{person.birthDate || "Date inconnue"} {person.birthPlace ? `— ${person.birthPlace}` : ""}</p>
              </div>

              {/* Baptême */}
              {person.baptismDate && (
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "-2.6rem", top: "0", background: "var(--bg-primary)", border: "2px solid var(--accent-emerald)", borderRadius: "10px", width: "18px", height: "18px", display: "block" }}></span>
                  <strong>👼 Baptême</strong>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{person.baptismDate} {person.baptismPlace ? `— ${person.baptismPlace}` : ""}</p>
                </div>
              )}

              {/* Mariages */}
              {unions.map((u, idx) => (
                <div key={u.id} style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "-2.6rem", top: "0", background: "var(--bg-primary)", border: "2px solid var(--accent-gold)", borderRadius: "10px", width: "18px", height: "18px", display: "block" }}></span>
                  <strong>💍 Union ({u.type === "MARRIAGE" ? "Mariage" : "Union libre"}) avec {u.partner.firstName} {u.partner.lastName.toUpperCase()}</strong>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    {u.weddingDate || "Date inconnue"} {u.weddingPlace ? `— ${u.weddingPlace}` : ""}
                  </p>
                </div>
              ))}

              {/* Naissance des enfants */}
              {children.map((c) => (
                <div key={c.id} style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "-2.6rem", top: "0", background: "var(--bg-primary)", border: "2px solid var(--accent-emerald)", borderRadius: "10px", width: "18px", height: "18px", display: "block" }}></span>
                  <strong>👶 Naissance de son enfant {c.firstName} {c.lastName?.toUpperCase()}</strong>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    {c.birthDate || "Date inconnue"} {c.birthPlace ? `— ${c.birthPlace}` : ""}
                  </p>
                </div>
              ))}

              {/* Décès */}
              {person.deathDate && (
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "-2.6rem", top: "0", background: "#ef4444", border: "2px solid #ef4444", borderRadius: "10px", width: "18px", height: "18px", display: "block" }}></span>
                  <strong style={{ color: "#ef4444" }}>💀 Décès</strong>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{person.deathDate} {person.deathPlace ? `— ${person.deathPlace}` : ""}</p>
                </div>
              )}

              {/* Inhumation */}
              {person.burialDate && (
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "-2.6rem", top: "0", background: "var(--bg-primary)", border: "2px solid var(--text-muted)", borderRadius: "10px", width: "18px", height: "18px", display: "block" }}></span>
                  <strong>⚰️ Inhumation</strong>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{person.burialDate} {person.burialPlace ? `— ${person.burialPlace}` : ""}</p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* 3. Onglet Relations & Conjoints */}
        <div className={`tab-pane ${activeTab === "relations" ? "active" : ""}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            
            {/* Ligne des Parents */}
            <div className="card glass">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 className="title-font" style={{ fontSize: "1.3rem", color: "var(--accent-gold)" }}>
                  🌿 Filiation (Parents)
                </h3>
                {!isEditingFiliation ? (
                  <button onClick={() => setIsEditingFiliation(true)} className="btn btn-secondary no-print" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                    Modifier Filiation
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "0.5rem" }} className="no-print">
                    <button onClick={handleFiliationSave} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }} disabled={savingFiliation}>
                      Sauvegarder
                    </button>
                    <button onClick={() => { setIsEditingFiliation(false); setSelectedFatherId(person.fatherId || ""); setSelectedMotherId(person.motherId || ""); }} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                      Annuler
                    </button>
                  </div>
                )}
              </div>

              {isEditingFiliation ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="no-print">
                  <div className="input-group">
                    <label className="input-label">Père</label>
                    <select value={selectedFatherId} onChange={(e) => setSelectedFatherId(e.target.value)} className="input-field">
                      <option value="">-- Aucun père --</option>
                      {potentialFathers.map(f => (
                        <option key={f.id} value={f.id}>{f.firstName} {f.lastName.toUpperCase()} {f.birthDate ? `(${f.birthDate.substring(0,4)})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Mère</label>
                    <select value={selectedMotherId} onChange={(e) => setSelectedMotherId(e.target.value)} className="input-field">
                      <option value="">-- Aucune mère --</option>
                      {potentialMothers.map(m => (
                        <option key={m.id} value={m.id}>{m.firstName} {m.lastName.toUpperCase()} {m.birthDate ? `(${m.birthDate.substring(0,4)})` : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {/* Carte Père */}
                  {person.father ? (
                    <a href={`/people/${person.father.id}`} className="card glass list-item-hover" style={{ borderLeft: "3px solid #2563eb", padding: "1rem", display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>👨‍🦳 PÈRE</span>
                      <strong>{person.father.firstName} {person.father.lastName.toUpperCase()}</strong>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{person.father.birthDate || "????"} - {person.father.deathDate || "Vivant"}</span>
                    </a>
                  ) : (
                    <div className="card glass" style={{ borderLeft: "3px solid var(--text-muted)", padding: "1.25rem", color: "var(--text-muted)" }}>
                      Père non renseigné
                    </div>
                  )}

                  {/* Carte Mère */}
                  {person.mother ? (
                    <a href={`/people/${person.mother.id}`} className="card glass list-item-hover" style={{ borderLeft: "3px solid #db2777", padding: "1rem", display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>👩‍🦳 MÈRE</span>
                      <strong>{person.mother.firstName} {person.mother.lastName.toUpperCase()}</strong>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{person.mother.birthDate || "????"} - {person.mother.deathDate || "Vivant"}</span>
                    </a>
                  ) : (
                    <div className="card glass" style={{ borderLeft: "3px solid var(--text-muted)", padding: "1.25rem", color: "var(--text-muted)" }}>
                      Mère non renseignée
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ligne des Conjoints / Mariages */}
            <div className="card glass font-print-union">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 className="title-font" style={{ fontSize: "1.3rem", color: "var(--accent-gold)" }}>
                  💍 Conjoints et Unions ({unions.length})
                </h3>
                <button onClick={() => setIsAddingUnion(!isAddingUnion)} className="btn btn-primary no-print" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                  {isAddingUnion ? "Fermer" : "Ajouter un conjoint"}
                </button>
              </div>

              {isAddingUnion && (
                <form onSubmit={handleAddUnionSubmit} className="card no-print" style={{ background: "var(--bg-tertiary)", padding: "1rem", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="input-group">
                      <label className="input-label">Conjoint <span style={{ color: "var(--accent-gold)" }}>*</span></label>
                      <select 
                        required
                        value={newUnionData.partner2Id} 
                        onChange={(e) => setNewUnionData(prev => ({ ...prev, partner2Id: e.target.value }))}
                        className="input-field"
                      >
                        <option value="">-- Sélectionner le conjoint --</option>
                        {allPeople.map(p => (
                          <option key={p.id} value={p.id}>{p.firstName} {p.lastName.toUpperCase()} {p.birthDate ? `(${p.birthDate.substring(0,4)})` : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Type d'Union</label>
                      <select 
                        value={newUnionData.type} 
                        onChange={(e) => setNewUnionData(prev => ({ ...prev, type: e.target.value }))}
                        className="input-field"
                      >
                        <option value="MARRIAGE">Mariage</option>
                        <option value="PARTNERSHIP">Union libre / PACS</option>
                        <option value="OTHER">Autre</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="input-group">
                      <label className="input-label">Date du mariage / union</label>
                      <input 
                        type="text" 
                        placeholder="ex: 10 OCT 1945" 
                        value={newUnionData.weddingDate} 
                        onChange={(e) => setNewUnionData(prev => ({ ...prev, weddingDate: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Lieu du mariage</label>
                      <input 
                        type="text" 
                        placeholder="ex: Lyon, France" 
                        value={newUnionData.weddingPlace} 
                        onChange={(e) => setNewUnionData(prev => ({ ...prev, weddingPlace: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                    <button type="submit" className="btn btn-primary" disabled={savingUnion}>
                      {savingUnion ? "Liaison..." : "Lier le couple"}
                    </button>
                  </div>
                </form>
              )}

              {unions.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Aucun mariage ni conjoint n'est renseigné.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {unions.map(u => (
                    <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }} className="union-item">
                      <div>
                        💍 Conjoint(e) : <a href={`/people/${u.partner.id}`} style={{ color: "var(--accent-gold)", fontWeight: 700 }} className="print-link">
                          {u.partner.firstName} {u.partner.lastName.toUpperCase()}
                        </a>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginLeft: "1rem" }}>
                          {u.weddingDate ? `Mariés le ${u.weddingDate}` : ""} {u.weddingPlace ? `à ${u.weddingPlace}` : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ligne des Enfants */}
            <div className="card glass">
              <h3 className="title-font" style={{ fontSize: "1.3rem", color: "var(--accent-gold)", marginBottom: "1rem" }}>
                👶 Enfants ({children.length})
              </h3>

              {children.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Aucun enfant n'est enregistré pour cette personne.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }} className="children-grid">
                  {children.map(c => (
                    <a key={c.id} href={`/people/${c.id}`} className="card glass list-item-hover print-link" style={{ padding: "0.75rem 1rem", borderLeft: c.gender === "M" ? "2px solid #2563eb" : "2px solid #db2777", display: "flex", flexDirection: "column" }}>
                      <strong>{c.firstName} {c.lastName?.toUpperCase()}</strong>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{c.birthDate || "????"} - {c.deathDate || "Vivant"}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>


        {/* 4. Onglet Galerie de Médias */}
        <div className={`tab-pane ${activeTab === "media" ? "active" : ""}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }} className="media-tab-layout">
            
            {/* Formulaire de téléversement */}
            <div className="card glass">
              <h3 className="title-font" style={{ fontSize: "1.3rem", color: "var(--accent-gold)", marginBottom: "1rem" }}>
                📁 Ajouter des photos ou des documents numérisés
              </h3>
              
              <form onSubmit={handleMediaUploadSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignItems: "end" }}>
                <div className="input-group">
                  <label className="input-label">Fichier <span style={{ color: "var(--accent-gold)" }}>*</span></label>
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                    className="input-field" 
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Titre du document</label>
                  <input 
                    type="text" 
                    placeholder="ex: Acte de Naissance 1923" 
                    value={uploadData.title}
                    onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                    className="input-field" 
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Type</label>
                  <select 
                    value={uploadData.type}
                    onChange={(e) => setUploadData(prev => ({ ...prev, type: e.target.value }))}
                    className="input-field"
                  >
                    <option value="PHOTO">Photo de famille</option>
                    <option value="DOCUMENT">Acte administratif (naissance, mariage, décès...)</option>
                    <option value="OTHER">Autre document</option>
                  </select>
                </div>

                <div className="input-group" style={{ display: "flex", flexDirection: "row", gap: "0.5rem", alignItems: "center", height: "45px" }}>
                  <input 
                    type="checkbox" 
                    id="setAvatarCheck"
                    checked={uploadData.setAvatar}
                    onChange={(e) => setUploadData(prev => ({ ...prev, setAvatar: e.target.checked }))}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <label htmlFor="setAvatarCheck" style={{ fontSize: "0.85rem", cursor: "pointer", color: "var(--text-secondary)", fontWeight: 600 }}>
                    Définir comme photo principale
                  </label>
                </div>

                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="btn btn-primary" disabled={!mediaFile || uploadingMedia}>
                    {uploadingMedia ? "⏳ Importation en cours..." : "📤 Téléverser le fichier"}
                  </button>
                </div>
              </form>
            </div>

            {/* Affichage des médias existants */}
            <div className="card glass">
              <h3 className="title-font" style={{ fontSize: "1.3rem", color: "var(--accent-gold)", marginBottom: "1rem" }}>
                🖼️ Galerie de documents ({person.media?.length || 0})
              </h3>
              
              {!person.media || person.media.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "2rem" }}>
                  Aucune photo ni document n'a été importé pour cette personne.
                </p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.5rem" }}>
                  {person.media.map(m => (
                    <div 
                      key={m.id} 
                      className="card" 
                      style={{ 
                        padding: "0.5rem", 
                        background: "var(--bg-tertiary)", 
                        border: "1px solid var(--border-subtle)", 
                        borderRadius: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem"
                      }}
                    >
                      {m.url.endsWith(".pdf") ? (
                        <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", background: "var(--bg-secondary)", borderRadius: "4px" }}>
                          📄
                        </div>
                      ) : (
                        <img 
                          src={m.url} 
                          alt={m.title} 
                          style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "4px" }} 
                        />
                      )}
                      <strong style={{ fontSize: "0.85rem", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {m.title}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {m.type === "PHOTO" ? "📷 Photo" : "📄 Acte/Document"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 5. Onglet Recherche en Ligne */}
        {activeTab === "search" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            
            {/* Recherche INSEE MatchID */}
            <div className="card glass">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 className="title-font" style={{ fontSize: "1.4rem", color: "var(--accent-gold)" }}>
                  🔎 Correspondances Décès INSEE (MatchID API)
                </h3>
                <button onClick={triggerMatchIdSearch} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }} disabled={searchingMatchId}>
                  🔄 Actualiser
                </button>
              </div>

              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Ce module interroge en temps réel le répertoire officiel des décès de l'INSEE (France) depuis 1970 pour trouver des actes correspondant au profil de <strong>{person.firstName} {person.lastName}</strong>.
              </p>

              {searchingMatchId ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  ⏳ Recherche en cours sur les serveurs de l'INSEE...
                </div>
              ) : searchError ? (
                <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "8px", fontSize: "0.9rem" }}>
                  {searchError}
                </div>
              ) : matchIdResults.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "2rem" }}>
                  Aucun décès officiel enregistré à l'INSEE ne semble correspondre à cette personne. (Il se peut qu'elle soit vivante ou décédée avant 1970).
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {matchIdResults.map((r, idx) => (
                    <div 
                      key={idx} 
                      className="card" 
                      style={{ 
                        background: "var(--bg-tertiary)", 
                        border: "1px solid var(--border-subtle)", 
                        padding: "1.25rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "1rem"
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <span style={{ fontSize: "0.75rem", background: "var(--accent-emerald-glow)", color: "var(--accent-emerald)", padding: "0.1rem 0.5rem", borderRadius: "4px", alignSelf: "flex-start", fontWeight: 700 }}>
                          CORRESPONDANCE TROUVÉE ({Math.round(r.score * 100)}%)
                        </span>
                        <strong style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>{r.name}</strong>
                        <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                          👶 Né(e) le {r.birthDate} à {r.birthPlace}
                        </span>
                        <span style={{ fontSize: "0.9rem", color: "#ef4444", fontWeight: 600 }}>
                          💀 Décédé(e) le {r.deathDate} à {r.deathPlace}
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => applyMatchIdInfo(r)}
                        className="btn btn-primary"
                        style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                      >
                        💾 Importer les dates
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Liens de recherche assistée */}
            <div className="card glass">
              <h3 className="title-font" style={{ fontSize: "1.3rem", color: "var(--accent-gold)", marginBottom: "1rem" }}>
                🔗 Liens Directs de Recherche Généalogique
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
                Recherchez cet ancêtre en un clic sur les grandes bases de données d'archives de l'État civil avec ses critères pré-remplis :
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                {/* Geneanet */}
                <a 
                  href={`https://www.geneanet.org/fonds/individus/?size=10&nom=${person.lastName}&prenom=${person.firstName}&year_debut=${birthYear}&year_fin=${birthYear}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ textAlign: "center", display: "block" }}
                >
                  🌳 Chercher sur Généanet
                </a>

                {/* FamilySearch */}
                <a 
                  href={`https://www.familysearch.org/search/record/results?q.givenName=${person.firstName}&q.surname=${person.lastName}&q.birthLikeDate.from=${birthYear}&q.birthLikeDate.to=${birthYear}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ textAlign: "center", display: "block" }}
                >
                  🌍 Chercher sur FamilySearch
                </a>

                {/* Filae */}
                <a 
                  href={`https://www.filae.com/v4/genealogie/Search.mvc/Search?fn=${person.firstName}&sn=${person.lastName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ textAlign: "center", display: "block" }}
                >
                  🇫🇷 Chercher sur Filae
                </a>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
