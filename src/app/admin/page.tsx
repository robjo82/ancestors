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

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  emailAnniversaries: boolean;
  emailNameDays: boolean;
  treeCount: number;
  peopleCount: number;
}

interface GlobalStats {
  totalUsers: number;
  totalTrees: number;
  totalPeople: number;
  totalSuggestions: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"SUGGESTIONS" | "USERS">("SUGGESTIONS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Suggestions State
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Users State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalUsers: 0,
    totalTrees: 0,
    totalPeople: 0,
    totalSuggestions: 0
  });

  // User Administration Forms State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch both features and admin users list parallelly
      const [featuresRes, usersRes] = await Promise.all([
        fetch("/api/features"),
        fetch("/api/admin/users")
      ]);

      if (featuresRes.ok && usersRes.ok) {
        const featuresData = await featuresRes.json();
        const usersData = await usersRes.json();

        setRequests(featuresData);
        setUsers(usersData.users || []);
        setGlobalStats(usersData.stats || {
          totalUsers: 0,
          totalTrees: 0,
          totalPeople: 0,
          totalSuggestions: 0
        });
      } else {
        if (featuresRes.status === 401 || usersRes.status === 401) {
          router.push("/login");
        } else {
          setError("Une erreur est survenue lors du chargement des données d'administration.");
        }
      }
    } catch (err) {
      console.error("Admin data loading error:", err);
      setError("Erreur réseau lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  // 1. Suggestions Actions Handlers
  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/features/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setRequests((prev) =>
          prev.map((req) => (req.id === id ? { ...req, status: newStatus } : req))
        );
        // Refresh stats
        setGlobalStats(prev => ({
          ...prev,
          totalSuggestions: prev.totalSuggestions
        }));
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

  const handleSuggestionDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette suggestion de fonctionnalité ?")) {
      return;
    }

    setUpdatingId(id);
    try {
      const response = await fetch(`/api/features/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setRequests((prev) => prev.filter((req) => req.id !== id));
        setGlobalStats(prev => ({
          ...prev,
          totalSuggestions: Math.max(0, prev.totalSuggestions - 1)
        }));
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

  // 2. Users Actions Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    
    if (!newUserEmail || !newUserPassword) {
      setCreateError("L'adresse email et le mot de passe sont requis.");
      return;
    }

    if (newUserPassword.length < 6) {
      setCreateError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    setCreateSubmitting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setCreateSuccess(`Le compte de ${data.name || data.email} a été créé avec succès !`);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        // Reload dashboard data
        loadAdminData();
      } else {
        setCreateError(data.error || "Erreur lors de la création du compte.");
      }
    } catch (err) {
      console.error(err);
      setCreateError("Erreur réseau de communication.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    if (!resetTargetUser) return;

    if (!resetPassword || resetPassword.length < 6) {
      setResetError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    setResetSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${resetTargetUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: resetPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setResetSuccess("Le mot de passe a été réinitialisé avec succès !");
        setResetPassword("");
      } else {
        setResetError(data.error || "Erreur lors du changement de mot de passe.");
      }
    } catch (err) {
      console.error(err);
      setResetError("Erreur réseau de communication.");
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleUserDelete = async (user: AdminUser) => {
    const message = `⚠️ ATTENTION ⚠️\n\nVoulez-vous vraiment supprimer définitivement le compte de ${user.name || user.email} ?\n\nCette action supprimera également tous ses arbres généalogiques (${user.treeCount}), ses fiches de personnes (${user.peopleCount}) et tous ses documents liés. Cette suppression est irréversible !`;
    
    if (!confirm(message)) {
      return;
    }

    setUpdatingId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        setGlobalStats(prev => ({
          ...prev,
          totalUsers: Math.max(0, prev.totalUsers - 1),
          totalTrees: Math.max(0, prev.totalTrees - user.treeCount),
          totalPeople: Math.max(0, prev.totalPeople - user.peopleCount)
        }));
      } else {
        alert(data.error || "Impossible de supprimer l'utilisateur.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau de communication.");
    } finally {
      setUpdatingId(null);
    }
  };

  const generateTempPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPassword(pass);
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
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="title-font" style={{ fontSize: "2.2rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
            🛠️ Espace d'Administration Générale
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Supervisez les statistiques d'activité, gérez les comptes utilisateurs et traitez les suggestions d'évolution.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="glass" style={{ display: "flex", padding: "0.3rem", borderRadius: "10px", background: "var(--bg-tertiary)" }}>
          <button
            onClick={() => setActiveTab("SUGGESTIONS")}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "var(--transition-fast)",
              color: activeTab === "SUGGESTIONS" ? "var(--accent-gold)" : "var(--text-secondary)",
              background: activeTab === "SUGGESTIONS" ? "var(--bg-secondary)" : "transparent",
              border: activeTab === "SUGGESTIONS" ? "1px solid var(--border-subtle)" : "none"
            }}
          >
            💡 Suggestions ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab("USERS")}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "var(--transition-fast)",
              color: activeTab === "USERS" ? "var(--accent-gold)" : "var(--text-secondary)",
              background: activeTab === "USERS" ? "var(--bg-secondary)" : "transparent",
              border: activeTab === "USERS" ? "1px solid var(--border-subtle)" : "none"
            }}
          >
            👤 Utilisateurs ({users.length})
          </button>
        </div>
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

      {/* -------------------- TAB: SUGGESTIONS -------------------- */}
      {activeTab === "SUGGESTIONS" && (
        <div>
          {/* KPI Cards section */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2.5rem",
            }}
          >
            <div className="card glass" style={{ padding: "1.25rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Total Suggestions
              </div>
              <div className="title-font" style={{ fontSize: "1.8rem", fontWeight: 800 }}>
                {requests.length}
              </div>
            </div>

            <div className="card glass" style={{ padding: "1.25rem", textAlign: "center", borderLeft: "4px solid rgb(249, 115, 22)" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(25, 95%, 70%)", marginBottom: "0.5rem" }}>
                🟠 En attente
              </div>
              <div className="title-font" style={{ fontSize: "1.8rem", fontWeight: 800 }}>
                {requests.filter(r => r.status === "PENDING").length}
              </div>
            </div>

            <div className="card glass" style={{ padding: "1.25rem", textAlign: "center", borderLeft: "4px solid rgb(234, 179, 8)" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(45, 93%, 68%)", marginBottom: "0.5rem" }}>
                🟡 Planifiées
              </div>
              <div className="title-font" style={{ fontSize: "1.8rem", fontWeight: 800 }}>
                {requests.filter(r => r.status === "PLANNED").length}
              </div>
            </div>

            <div className="card glass" style={{ padding: "1.25rem", textAlign: "center", borderLeft: "4px solid rgb(16, 185, 129)" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(142, 70%, 75%)", marginBottom: "0.5rem" }}>
                🟢 Terminées
              </div>
              <div className="title-font" style={{ fontSize: "1.8rem", fontWeight: 800 }}>
                {requests.filter(r => r.status === "COMPLETED").length}
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
            <div className="card glass" style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                      <div>
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

                      <span style={{ background: badge.bg, border: badge.border, color: badge.color, padding: "0.3rem 0.75rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 600 }}>
                        {badge.label}
                      </span>
                    </div>

                    <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6", whiteSpace: "pre-wrap", marginBottom: "1.5rem", background: "rgba(0, 0, 0, 0.1)", padding: "1rem", borderRadius: "8px", borderLeft: "3px solid var(--border-subtle)" }}>
                      {req.description}
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      <div>
                        Proposé par <strong style={{ color: "var(--text-secondary)" }}>{req.userEmail || "Anonyme"}</strong> le {formatDate(req.createdAt)}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Changer statut :</span>
                        <select
                          className="input-field"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", cursor: "pointer", height: "32px" }}
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
                          onClick={() => handleSuggestionDelete(req.id)}
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
      )}

      {/* -------------------- TAB: USERS -------------------- */}
      {activeTab === "USERS" && (
        <div>
          {/* Global activity statistics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2.5rem",
            }}
          >
            <div className="card glass" style={{ padding: "1.25rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Comptes Actifs
              </div>
              <div className="title-font" style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-emerald)" }}>
                {globalStats.totalUsers}
              </div>
            </div>

            <div className="card glass" style={{ padding: "1.25rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Arbres Généalogiques
              </div>
              <div className="title-font" style={{ fontSize: "1.8rem", fontWeight: 800 }}>
                {globalStats.totalTrees}
              </div>
            </div>

            <div className="card glass" style={{ padding: "1.25rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Individus Enregistrés
              </div>
              <div className="title-font" style={{ fontSize: "1.8rem", fontWeight: 800 }}>
                {globalStats.totalPeople}
              </div>
            </div>

            <div className="card glass" style={{ padding: "1.25rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Suggestions Émises
              </div>
              <div className="title-font" style={{ fontSize: "1.8rem", fontWeight: 800 }}>
                {globalStats.totalSuggestions}
              </div>
            </div>
          </div>

          {/* Action Header bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 className="title-font" style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>
              👤 Répertoire des Comptes Utilisateurs
            </h2>
            <button
              onClick={() => {
                setCreateError("");
                setCreateSuccess("");
                setShowCreateModal(true);
              }}
              className="btn btn-primary"
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", borderRadius: "8px" }}
            >
              ➕ Créer un utilisateur
            </button>
          </div>

          {/* Users Directory list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {users.length === 0 ? (
              <div className="card glass" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                Aucun compte utilisateur enregistré dans la base de données.
              </div>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="card glass list-item-hover"
                  style={{
                    padding: "1.5rem",
                    transition: "var(--transition-smooth)",
                    opacity: updatingId === u.id ? 0.6 : 1,
                    border: updatingId === u.id ? "1px solid var(--accent-gold)" : "1px solid var(--glass-border)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <h3 className="title-font" style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        👤 {u.name || "Utilisateur sans nom"}
                      </h3>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                        📧 {u.email}
                      </p>
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        <span>📅 Inscrit le {new Date(u.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span>🌳 Arbres : <strong>{u.treeCount}</strong></span>
                        <span>👥 Fiches : <strong>{u.peopleCount}</strong></span>
                      </div>
                      
                      {/* Notifications preferences badges */}
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                        {u.emailAnniversaries && (
                          <span style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.12)", color: "hsl(142, 70%, 75%)", padding: "0.15rem 0.5rem", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                            🎂 Rappels Anniv
                          </span>
                        )}
                        {u.emailNameDays && (
                          <span style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.12)", color: "hsl(142, 70%, 75%)", padding: "0.15rem 0.5rem", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                            📅 Fêtes Grég
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Standard Admin account tools */}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => {
                          setResetTargetUser(u);
                          setResetPassword("");
                          setResetError("");
                          setResetSuccess("");
                          setShowResetModal(true);
                        }}
                        className="btn btn-secondary"
                        disabled={updatingId === u.id}
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "6px", height: "34px" }}
                      >
                        🔑 Réinitialiser MDP
                      </button>
                      <button
                        onClick={() => handleUserDelete(u)}
                        disabled={updatingId === u.id}
                        className="btn"
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.8rem",
                          borderRadius: "6px",
                          height: "34px",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          background: "rgba(239, 68, 68, 0.05)",
                          color: "hsl(0, 85%, 75%)"
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
              ))
            )}
          </div>
        </div>
      )}

      {/* -------------------- DIALOG MODAL: CREATE USER -------------------- */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(5px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div className="card glass" style={{ padding: "2.25rem", maxWidth: "500px", width: "100%", animation: "scaleIn 0.3s ease-out" }}>
            <h3 className="title-font" style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-gold)", marginBottom: "1rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
              👤 Créer un nouveau compte utilisateur
            </h3>

            {createError && (
              <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "hsl(0, 85%, 75%)", padding: "0.6rem 0.8rem", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem" }}>
                ⚠️ {createError}
              </div>
            )}
            
            {createSuccess && (
              <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "hsl(142, 70%, 75%)", padding: "0.6rem 0.8rem", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem" }}>
                ✅ {createSuccess}
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="input-group">
                <label className="input-label">Nom complet</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex : Robin Dupont"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  disabled={createSubmitting}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Adresse email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="nom@exemple.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  disabled={createSubmitting}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: "1rem" }}>
                <label className="input-label">Mot de passe</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Au moins 6 caractères"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  disabled={createSubmitting}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  disabled={createSubmitting}
                  style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createSubmitting}
                  style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem" }}
                >
                  {createSubmitting ? "Création..." : "➕ Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- DIALOG MODAL: RESET PASSWORD -------------------- */}
      {showResetModal && resetTargetUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(5px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div className="card glass" style={{ padding: "2.25rem", maxWidth: "500px", width: "100%", animation: "scaleIn 0.3s ease-out" }}>
            <h3 className="title-font" style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-gold)", marginBottom: "1rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
              🔑 Réinitialiser le mot de passe
            </h3>

            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              Vous forcez le changement de mot de passe pour le compte de <strong style={{ color: "var(--text-primary)" }}>{resetTargetUser.name || resetTargetUser.email}</strong>.
            </p>

            {resetError && (
              <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "hsl(0, 85%, 75%)", padding: "0.6rem 0.8rem", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem" }}>
                ⚠️ {resetError}
              </div>
            )}
            
            {resetSuccess && (
              <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "hsl(142, 70%, 75%)", padding: "0.6rem 0.8rem", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem" }}>
                ✅ {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="input-group" style={{ marginBottom: "0.5rem" }}>
                <label className="input-label">Nouveau mot de passe</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    className="input-field"
                    style={{ flex: 1 }}
                    placeholder="Saisissez un mot de passe ou générez-en un"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    disabled={resetSubmitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={generateTempPassword}
                    className="btn btn-secondary"
                    style={{ padding: "0.5rem", fontSize: "0.85rem", height: "45px" }}
                    title="Générer un mot de passe robuste"
                  >
                    🎲 Générer
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="btn btn-secondary"
                  disabled={resetSubmitting}
                  style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resetSubmitting}
                  style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem" }}
                >
                  {resetSubmitting ? "Changement..." : "🔑 Modifier le mot de passe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
