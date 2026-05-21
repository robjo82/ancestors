"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  userEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/features");
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      } else {
        if (response.status === 401) {
          router.push("/login");
        } else {
          setError("Impossible de charger les suggestions de fonctionnalités.");
        }
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setError("Erreur réseau lors de la récupération des suggestions.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/features/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update local state smoothly
        setRequests((prev) =>
          prev.map((req) => (req.id === id ? { ...req, status: newStatus } : req))
        );
      } else {
        alert("Erreur lors de la mise à jour du statut.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau lors de la mise à jour.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette suggestion de fonctionnalité ? Cette action est irréversible.")) {
      return;
    }

    setUpdatingId(id);
    try {
      const response = await fetch(`/api/features/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from local state with transition-like instant update
        setRequests((prev) => prev.filter((req) => req.id !== id));
      } else {
        alert("Erreur lors de la suppression de la suggestion.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau lors de la suppression.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "ui":
        return "🖥️ Ergonomie & Interface";
      case "performance":
        return "⚡ Performance";
      case "import-export":
        return "📤 Import / Export GEDCOM";
      case "familysearch":
        return "🌍 FamilySearch";
      default:
        return "💡 Autre suggestion";
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          bg: "rgba(249, 115, 22, 0.15)",
          border: "1px solid rgba(249, 115, 22, 0.3)",
          color: "hsl(25, 95%, 70%)",
          label: "En attente",
        };
      case "PLANNED":
        return {
          bg: "rgba(234, 179, 8, 0.15)",
          border: "1px solid rgba(234, 179, 8, 0.3)",
          color: "hsl(45, 93%, 68%)",
          label: "Planifié",
        };
      case "COMPLETED":
        return {
          bg: "rgba(16, 185, 129, 0.15)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          color: "hsl(142, 70%, 75%)",
          label: "Terminé",
        };
      case "REJECTED":
        return {
          bg: "rgba(239, 68, 68, 0.12)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          color: "hsl(0, 85%, 75%)",
          label: "Rejeté",
        };
      default:
        return {
          bg: "rgba(255, 255, 255, 0.08)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-secondary)",
          label: "Inconnu",
        };
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  // KPIs
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const plannedCount = requests.filter((r) => r.status === "PLANNED").length;
  const completedCount = requests.filter((r) => r.status === "COMPLETED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
    const matchesCategory = categoryFilter === "ALL" || req.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "6rem 0", color: "var(--text-secondary)" }}>
        <p style={{ fontSize: "1.1rem" }}>⏳ Chargement de l'interface d'administration...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", animation: "fadeIn 0.4s ease-out" }}>
      {/* Title Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 className="title-font" style={{ fontSize: "2.2rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
          🛠️ Administration des Suggestions
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          Visualisez, triez, mettez à jour et gérez l'ensemble des demandes de fonctionnalités soumises par les utilisateurs.
        </p>
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
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2.5rem",
        }}
      >
        {/* KPI: Total */}
        <div className="card glass" style={{ padding: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            Total Suggestions
          </div>
          <div className="title-font" style={{ fontSize: "2rem", fontWeight: 800 }}>
            {totalCount}
          </div>
        </div>

        {/* KPI: Pending */}
        <div className="card glass" style={{ padding: "1.5rem", textAlign: "center", borderLeft: "4px solid rgb(249, 115, 22)" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(25, 95%, 70%)", marginBottom: "0.5rem" }}>
            🟠 En attente
          </div>
          <div className="title-font" style={{ fontSize: "2rem", fontWeight: 800 }}>
            {pendingCount}
          </div>
        </div>

        {/* KPI: Planned */}
        <div className="card glass" style={{ padding: "1.5rem", textAlign: "center", borderLeft: "4px solid rgb(234, 179, 8)" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(45, 93%, 68%)", marginBottom: "0.5rem" }}>
            🟡 Planifiées
          </div>
          <div className="title-font" style={{ fontSize: "2rem", fontWeight: 800 }}>
            {plannedCount}
          </div>
        </div>

        {/* KPI: Completed */}
        <div className="card glass" style={{ padding: "1.5rem", textAlign: "center", borderLeft: "4px solid rgb(16, 185, 129)" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(142, 70%, 75%)", marginBottom: "0.5rem" }}>
            🟢 Terminées
          </div>
          <div className="title-font" style={{ fontSize: "2rem", fontWeight: 800 }}>
            {completedCount}
          </div>
        </div>

        {/* KPI: Rejected */}
        <div className="card glass" style={{ padding: "1.5rem", textAlign: "center", borderLeft: "4px solid rgb(239, 68, 68)" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(0, 85%, 75%)", marginBottom: "0.5rem" }}>
            🔴 Rejetées
          </div>
          <div className="title-font" style={{ fontSize: "2rem", fontWeight: 800 }}>
            {rejectedCount}
          </div>
        </div>
      </div>

      {/* Interactive Filters Area */}
      <div
        className="card glass"
        style={{
          padding: "1.25rem 1.5rem",
          marginBottom: "2rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-secondary)" }}>
          🔍 Filtrer & Trier les demandes :
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {/* Status Select Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Statut :</span>
            <select
              className="input-field"
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", cursor: "pointer" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PENDING">🟠 En attente</option>
              <option value="PLANNED">🟡 Planifié</option>
              <option value="COMPLETED">🟢 Terminé</option>
              <option value="REJECTED">🔴 Rejeté</option>
            </select>
          </div>

          {/* Category Select Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Catégorie :</span>
            <select
              className="input-field"
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", cursor: "pointer" }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">Toutes les catégories</option>
              <option value="ui">🖥️ Ergonomie & Interface</option>
              <option value="performance">⚡ Performance</option>
              <option value="import-export">📤 Import / Export</option>
              <option value="familysearch">🌍 FamilySearch</option>
              <option value="other">💡 Autre</option>
            </select>
          </div>
        </div>
      </div>

      {/* Suggestions List Rendering */}
      {filteredRequests.length === 0 ? (
        <div
          className="card glass"
          style={{
            padding: "4rem 2rem",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "1rem" }}>📭</span>
          <p style={{ fontSize: "1.05rem" }}>Aucune suggestion de fonctionnalité ne correspond aux filtres appliqués.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {filteredRequests.map((req) => {
            const badge = getStatusBadgeStyles(req.status);
            return (
              <div
                key={req.id}
                className="card glass list-item-hover"
                style={{
                  padding: "1.75rem",
                  transition: "var(--transition-smooth)",
                  border: updatingId === req.id ? "1px solid var(--accent-gold)" : "1px solid var(--glass-border)",
                  opacity: updatingId === req.id ? 0.7 : 1,
                }}
              >
                {/* Request Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  <div>
                    {/* Category Label Tag */}
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: "var(--accent-emerald)",
                        background: "var(--accent-emerald-glow)",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "12px",
                        marginRight: "0.75rem",
                      }}
                    >
                      {getCategoryLabel(req.category)}
                    </span>
                    <h3 className="title-font" style={{ fontSize: "1.3rem", fontWeight: 700, display: "inline-block", marginTop: "0.5rem", color: "var(--text-primary)" }}>
                      {req.title}
                    </h3>
                  </div>

                  {/* Status Badge */}
                  <span
                    style={{
                      background: badge.bg,
                      border: badge.border,
                      color: badge.color,
                      padding: "0.3rem 0.75rem",
                      borderRadius: "20px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Description content */}
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.95rem",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    marginBottom: "1.5rem",
                    background: "rgba(0, 0, 0, 0.1)",
                    padding: "1rem",
                    borderRadius: "8px",
                    borderLeft: "3px solid var(--border-subtle)",
                  }}
                >
                  {req.description}
                </p>

                {/* Footer Metadata and Admin Controls */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: "1rem",
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <div>
                    Proposé par <strong style={{ color: "var(--text-secondary)" }}>{req.userEmail || "Anonyme"}</strong> le {formatDate(req.createdAt)}
                  </div>

                  {/* Interactive status update dropdown & delete button */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Changer statut :</span>
                    <select
                      className="input-field"
                      style={{
                        padding: "0.3rem 0.6rem",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        height: "32px",
                      }}
                      value={req.status}
                      disabled={updatingId === req.id}
                      onChange={(e) => handleStatusChange(req.id, e.target.value)}
                    >
                      <option value="PENDING">🟠 En attente</option>
                      <option value="PLANNED">🟡 Planifié</option>
                      <option value="COMPLETED">🟢 Terminé</option>
                      <option value="REJECTED">🔴 Rejeté</option>
                    </select>

                    <button
                      onClick={() => handleDelete(req.id)}
                      className="btn"
                      disabled={updatingId === req.id}
                      style={{
                        padding: "0.3rem 0.75rem",
                        fontSize: "0.8rem",
                        borderRadius: "6px",
                        height: "32px",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        background: "rgba(239, 68, 68, 0.05)",
                        color: "hsl(0, 85%, 75%)",
                        cursor: "pointer",
                        transition: "var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.6)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)";
                        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                      }}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
