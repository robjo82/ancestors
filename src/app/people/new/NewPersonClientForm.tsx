"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseDate } from "../../../utils/dateParser";
import { checkPersonConsistency } from "../../../utils/consistency";
import PlaceInput from "../../components/PlaceInput";

interface ParentOption {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  deathDate: string | null;
}

interface NewPersonClientFormProps {
  males: ParentOption[];
  females: ParentOption[];
}

export default function NewPersonClientForm({ males, females }: NewPersonClientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthName: "",
    gender: "M",
    birthDate: "",
    birthPlace: "",
    baptismDate: "",
    baptismPlace: "",
    deathDate: "",
    deathPlace: "",
    burialDate: "",
    burialPlace: "",
    occupation: "",
    notes: "",
    fatherId: "",
    motherId: "",
  });

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

  const getDraftWarnings = () => {
    const fatherObj = males.find((m) => m.id === formData.fatherId) || null;
    const motherObj = females.find((f) => f.id === formData.motherId) || null;

    const draftPerson = {
      id: "new-person",
      firstName: formData.firstName || "Nouvel",
      lastName: formData.lastName || "Individu",
      gender: formData.gender,
      birthDate: formData.birthDate || null,
      deathDate: formData.deathDate || null,
      fatherId: formData.fatherId || null,
      motherId: formData.motherId || null,
      father: fatherObj ? {
        id: fatherObj.id,
        firstName: fatherObj.firstName,
        lastName: fatherObj.lastName,
        birthDate: fatherObj.birthDate,
        deathDate: fatherObj.deathDate,
      } : null,
      mother: motherObj ? {
        id: motherObj.id,
        firstName: motherObj.firstName,
        lastName: motherObj.lastName,
        birthDate: motherObj.birthDate,
        deathDate: motherObj.deathDate,
      } : null,
    };

    return checkPersonConsistency(draftPerson, [], []);
  };

  const draftWarnings = getDraftWarnings();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      setError("Le prénom et le nom de famille sont obligatoires.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/people", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newPerson = await response.json();
        router.push(`/people/${newPerson.id}`);
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || "Une erreur est survenue lors de l'enregistrement.");
      }
    } catch (err) {
      console.error(err);
      setError("Impossible de joindre le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card glass" style={{ display: "flex", flexDirection: "column", gap: "2rem", padding: "2rem" }}>
      {error && (
        <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "8px", fontSize: "0.95rem" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Panneau d'alertes de cohérence chronologique en temps réel */}
      {draftWarnings.length > 0 && (
        <div className="glass" style={{ 
          padding: "1.5rem", 
          border: "1px solid rgba(239, 68, 68, 0.25)", 
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02))",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(239, 68, 68, 0.05)",
        }}>
          <h3 className="title-font" style={{ fontSize: "1.25rem", color: "#f87171", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <span className="pulsate" style={{ fontSize: "1.4rem" }}>⚠️</span> Anomalies Chronologiques Détectées ({draftWarnings.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {draftWarnings.map((warning: any, idx: number) => (
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
                  background: warning.severity === "error" ? "rgba(239, 68, 68, 0.2)" : "rgba(251, 191, 36, 0.2)",
                  color: warning.severity === "error" ? "#f87171" : "#fbbf24"
                }}>
                  {warning.severity.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 1 : Identité */}
      <div>
        <h3 className="title-font" style={{ fontSize: "1.2rem", color: "var(--accent-gold)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
          👤 Identité & Informations Générales
        </h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="input-group">
            <label className="input-label">Prénom(s) <span style={{ color: "var(--accent-gold)" }}>*</span></label>
            <input 
              type="text" 
              name="firstName" 
              value={formData.firstName}
              onChange={handleChange}
              placeholder="ex: Jean Pierre" 
              className="input-field" 
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Nom de famille <span style={{ color: "var(--accent-gold)" }}>*</span></label>
            <input 
              type="text" 
              name="lastName" 
              value={formData.lastName}
              onChange={handleChange}
              placeholder="ex: DUPONT" 
              className="input-field" 
              required
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="input-group">
            <label className="input-label">Nom de jeune fille (si applicable)</label>
            <input 
              type="text" 
              name="birthName" 
              value={formData.birthName}
              onChange={handleChange}
              placeholder="ex: MARTIN" 
              className="input-field" 
            />
          </div>

          <div className="input-group">
            <label className="input-label">Sexe <span style={{ color: "var(--accent-gold)" }}>*</span></label>
            <select 
              name="gender" 
              value={formData.gender}
              onChange={handleChange}
              className="input-field"
              style={{ cursor: "pointer" }}
            >
              <option value="M">Homme ♂</option>
              <option value="F">Femme ♀</option>
              <option value="U">Inconnu ❓</option>
            </select>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Profession / Métier</label>
          <input 
            type="text" 
            name="occupation" 
            value={formData.occupation}
            onChange={handleChange}
            placeholder="ex: Menuisier, Institutrice" 
            className="input-field" 
          />
        </div>
      </div>

      {/* Section 2 : Événements de Vie */}
      <div>
        <h3 className="title-font" style={{ fontSize: "1.2rem", color: "var(--accent-gold)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
          📅 Événements de sa Vie
        </h3>

        {/* Naissance */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="input-group">
            <label className="input-label">Date de Naissance</label>
            <input 
              type="text" 
              name="birthDate" 
              value={formData.birthDate}
              onChange={handleChange}
              placeholder="ex: 12 APR 1923, 1923, ou circa 1920" 
              className="input-field" 
            />
            {renderDateFeedback(formData.birthDate)}
          </div>
          <div className="input-group">
            <label className="input-label">Lieu de Naissance</label>
            <PlaceInput
              name="birthPlace"
              value={formData.birthPlace}
              onChange={(val) => setFormData((prev) => ({ ...prev, birthPlace: val }))}
              placeholder="ex: Paris 14e, Lyon, Strasbourg"
            />
          </div>
        </div>

        {/* Baptême */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="input-group">
            <label className="input-label">Date de Baptême</label>
            <input 
              type="text" 
              name="baptismDate" 
              value={formData.baptismDate}
              onChange={handleChange}
              placeholder="ex: 20 APR 1923" 
              className="input-field" 
            />
            {renderDateFeedback(formData.baptismDate)}
          </div>
          <div className="input-group">
            <label className="input-label">Lieu de Baptême</label>
            <PlaceInput
              name="baptismPlace"
              value={formData.baptismPlace}
              onChange={(val) => setFormData((prev) => ({ ...prev, baptismPlace: val }))}
              placeholder="ex: Bordeaux, Nantes"
            />
          </div>
        </div>

        {/* Décès */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="input-group">
            <label className="input-label">Date de Décès</label>
            <input 
              type="text" 
              name="deathDate" 
              value={formData.deathDate}
              onChange={handleChange}
              placeholder="ex: 25 DEC 1999 (laisser vide si vivant)" 
              className="input-field" 
            />
            {renderDateFeedback(formData.deathDate)}
          </div>
          <div className="input-group">
            <label className="input-label">Lieu de Décès</label>
            <PlaceInput
              name="deathPlace"
              value={formData.deathPlace}
              onChange={(val) => setFormData((prev) => ({ ...prev, deathPlace: val }))}
              placeholder="ex: Lyon, France ou autre"
            />
          </div>
        </div>

        {/* Inhumation */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="input-group">
            <label className="input-label">Date d'Inhumation</label>
            <input 
              type="text" 
              name="burialDate" 
              value={formData.burialDate}
              onChange={handleChange}
              placeholder="ex: 28 DEC 1999" 
              className="input-field" 
            />
            {renderDateFeedback(formData.burialDate)}
          </div>
          <div className="input-group">
            <label className="input-label">Lieu d'Inhumation</label>
            <PlaceInput
              name="burialPlace"
              value={formData.burialPlace}
              onChange={(val) => setFormData((prev) => ({ ...prev, burialPlace: val }))}
              placeholder="ex: Cimetière du Père-Lachaise, Paris"
            />
          </div>
        </div>
      </div>

      {/* Section 3 : Filiation / Parents */}
      <div>
        <h3 className="title-font" style={{ fontSize: "1.2rem", color: "var(--accent-gold)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
          🌿 Filiation (Parents directs)
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="input-group">
            <label className="input-label">Père</label>
            <select 
              name="fatherId" 
              value={formData.fatherId}
              onChange={handleChange}
              className="input-field"
              style={{ cursor: "pointer" }}
            >
              <option value="">-- Sélectionner le père (facultatif) --</option>
              {males.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName.toUpperCase()} {m.birthDate ? `(${m.birthDate.substring(0,4)})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Mère</label>
            <select 
              name="motherId" 
              value={formData.motherId}
              onChange={handleChange}
              className="input-field"
              style={{ cursor: "pointer" }}
            >
              <option value="">-- Sélectionner la mère (facultatif) --</option>
              {females.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.firstName} {f.lastName.toUpperCase()} {f.birthDate ? `(${f.birthDate.substring(0,4)})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 4 : Notes & Biographie */}
      <div>
        <h3 className="title-font" style={{ fontSize: "1.2rem", color: "var(--accent-gold)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
          📝 Notes de recherche & Biographie
        </h3>
        
        <div className="input-group">
          <label className="input-label">Notes</label>
          <textarea 
            name="notes" 
            value={formData.notes}
            onChange={handleChange}
            placeholder="Saisissez ici des détails sur sa vie, anecdotes familiales, références d'actes d'état civil, etc." 
            className="input-field" 
            style={{ minHeight: "120px", resize: "vertical" }}
          />
        </div>
      </div>

      {/* Boutons d'action */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
        <button 
          type="button" 
          onClick={() => router.back()} 
          className="btn btn-secondary"
        >
          Annuler
        </button>
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? "💾 Enregistrement..." : "💾 Créer l'Individu"}
        </button>
      </div>
    </form>
  );
}
