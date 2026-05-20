"use client";

import { useState, useEffect, useRef } from "react";
import { parseDate } from "../../utils/dateParser";
import { checkPersonConsistency, ChronologyWarning } from "../../utils/consistency";
import PlaceInput from "./PlaceInput";

interface QuickCreatePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPerson: any) => void;
  initialGender?: string;
  initialLastName?: string;
  title?: string;
}

export default function QuickCreatePersonModal({
  isOpen,
  onClose,
  onSuccess,
  initialGender = "M",
  initialLastName = "",
  title = "Ajouter un Nouvel Individu"
}: QuickCreatePersonModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthName: "",
    gender: "M",
    birthDate: "",
    birthPlace: "",
    deathDate: "",
    deathPlace: "",
    occupation: "",
    notes: ""
  });

  // Sync open/close state of native dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      // Re-initialize state when opening
      setFormData({
        firstName: "",
        lastName: initialLastName,
        birthName: "",
        gender: initialGender,
        birthDate: "",
        birthPlace: "",
        deathDate: "",
        deathPlace: "",
        occupation: "",
        notes: ""
      });
      setError("");
      
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen, initialGender, initialLastName]);

  const getMonthName = (m: number): string => {
    const months = [
      "janvier", "février", "mars", "avril", "mai", "juin", 
      "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ];
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
        <span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.2rem" }}>
          🟢 Reconnu : {approxStr}{dayStr}{monthStr} {parsed.year}
        </span>
      );
    } else {
      return (
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.2rem" }}>
          ⚠️ Date non reconnue (texte brut simple)
        </span>
      );
    }
  };

  // Perform live chronological validation
  const getDraftWarnings = (): ChronologyWarning[] => {
    if (!formData.firstName && !formData.lastName) return [];
    
    const draftPerson = {
      id: "quick-new-person",
      firstName: formData.firstName || "Nouvel",
      lastName: formData.lastName || "Individu",
      gender: formData.gender,
      birthDate: formData.birthDate || null,
      deathDate: formData.deathDate || null,
      fatherId: null,
      motherId: null
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
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newPerson = await response.json();
        onSuccess(newPerson);
        onClose();
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

  // Handle clicking on the backdrop of the native dialog to close it
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      style={{
        border: "none",
        background: "transparent",
        padding: 0,
        maxWidth: "600px",
        width: "90%",
        borderRadius: "16px",
        outline: "none"
      }}
    >
      <div 
        className="glass" 
        style={{ 
          padding: "1.5rem 2rem", 
          background: "var(--bg-secondary)", 
          border: "1px solid var(--glass-border)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          color: "var(--text-primary)"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.75rem" }}>
          <h3 className="title-font" style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--accent-gold)", margin: 0 }}>
            {title}
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ 
              fontSize: "1.2rem", 
              color: "var(--text-muted)", 
              cursor: "pointer",
              transition: "color 0.2s" 
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
          >
            ✕
          </button>
        </div>

        {/* Error panel */}
        {error && (
          <div style={{ padding: "0.75rem 1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "8px", fontSize: "0.85rem" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Chronological Warnings */}
        {draftWarnings.length > 0 && (
          <div style={{ 
            padding: "0.75rem 1rem", 
            border: "1px solid rgba(239, 68, 68, 0.2)", 
            background: "rgba(239, 68, 68, 0.04)",
            borderRadius: "8px",
          }}>
            <h4 style={{ fontSize: "0.8rem", color: "#f87171", margin: "0 0 0.5rem 0", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              ⚠️ Anomalies détectées ({draftWarnings.length})
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {draftWarnings.map((w, idx) => (
                <div key={idx} style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  • {w.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          {/* Identity Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: "0.75rem" }}>Prénom(s) <span style={{ color: "var(--accent-gold)" }}>*</span></label>
              <input 
                type="text" 
                name="firstName" 
                value={formData.firstName}
                onChange={handleChange}
                placeholder="ex: Marie" 
                className="input-field" 
                required
                autoFocus
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: "0.75rem" }}>Nom de famille <span style={{ color: "var(--accent-gold)" }}>*</span></label>
              <input 
                type="text" 
                name="lastName" 
                value={formData.lastName}
                onChange={handleChange}
                placeholder="ex: MARTIN" 
                className="input-field" 
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: "0.75rem" }}>Nom de jeune fille</label>
              <input 
                type="text" 
                name="birthName" 
                value={formData.birthName}
                onChange={handleChange}
                placeholder="ex: ROBERT" 
                className="input-field" 
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: "0.75rem" }}>Sexe <span style={{ color: "var(--accent-gold)" }}>*</span></label>
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

          {/* Birth Event */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: "0.75rem" }}>Date de Naissance</label>
              <input 
                type="text" 
                name="birthDate" 
                value={formData.birthDate}
                onChange={handleChange}
                placeholder="ex: 15 mai 1812, 1812" 
                className="input-field" 
              />
              {renderDateFeedback(formData.birthDate)}
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: "0.75rem" }}>Lieu de Naissance</label>
              <PlaceInput
                name="birthPlace"
                value={formData.birthPlace}
                onChange={(val) => setFormData((prev) => ({ ...prev, birthPlace: val }))}
                placeholder="ex: Paris, Lyon (France ou autre)"
              />
            </div>
          </div>

          {/* Death Event */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: "0.75rem" }}>Date de Décès</label>
              <input 
                type="text" 
                name="deathDate" 
                value={formData.deathDate}
                onChange={handleChange}
                placeholder="ex: 20 oct 1888 (vide si vivant)" 
                className="input-field" 
              />
              {renderDateFeedback(formData.deathDate)}
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" style={{ fontSize: "0.75rem" }}>Lieu de Décès</label>
              <PlaceInput
                name="deathPlace"
                value={formData.deathPlace}
                onChange={(val) => setFormData((prev) => ({ ...prev, deathPlace: val }))}
                placeholder="ex: Lyon, Bordeaux (France ou autre)"
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ fontSize: "0.75rem" }}>Profession / Métier</label>
            <input 
              type="text" 
              name="occupation" 
              value={formData.occupation}
              onChange={handleChange}
              placeholder="ex: Vigneron, Couturière" 
              className="input-field" 
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem", marginTop: "0.5rem" }}>
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn-secondary"
              style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}
              disabled={loading}
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}
              disabled={loading}
            >
              {loading ? "Création..." : "Créer l'Individu"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
