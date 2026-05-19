"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Tree {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: {
    people: number;
    unions: number;
    media: number;
  };
}

export default function TreesPage() {
  const router = useRouter();
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal / Form States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  
  const [treeName, setTreeName] = useState("");
  const [treeDesc, setTreeDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTrees();
  }, []);

  const fetchTrees = async () => {
    try {
      const response = await fetch("/api/trees");
      if (response.ok) {
        const data = await response.json();
        setTrees(data);
      } else {
        setError("Impossible de charger vos arbres.");
      }
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des arbres.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treeName) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/trees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: treeName, description: treeDesc }),
      });

      if (response.ok) {
        setTreeName("");
        setTreeDesc("");
        setIsCreateModalOpen(false);
        await fetchTrees();
        router.refresh();
        // Reload active tree scope
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la création.");
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTree || !treeName) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/trees/${selectedTree.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: treeName, description: treeDesc }),
      });

      if (response.ok) {
        setTreeName("");
        setTreeDesc("");
        setIsEditModalOpen(false);
        setSelectedTree(null);
        await fetchTrees();
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la modification.");
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTree = async (treeId: string, name: string) => {
    const confirmText = `⚠️ Êtes-vous ABSOLUMENT sûr de vouloir supprimer l'arbre "${name}" ?\n\nCette action est irréversible et supprimera TOUS les individus, unions et photos rattachés à cet arbre !`;
    if (!window.confirm(confirmText)) return;

    try {
      const response = await fetch(`/api/trees/${treeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchTrees();
        router.refresh();
        // Force full refresh
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la suppression.");
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue.");
    }
  };

  const handleSetActiveTree = async (treeId: string) => {
    try {
      const response = await fetch("/api/trees/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treeId }),
      });

      if (response.ok) {
        router.refresh();
        window.location.href = "/";
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
        <p>Chargement de vos arbres généalogiques...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", animation: "fadeIn 0.4s ease-out" }}>
      {/* Header section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="title-font" style={{ fontSize: "2.2rem", fontWeight: 800, margin: 0 }}>
            🌿 Mes Arbres Généalogiques
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Gérez vos différents projets généalogiques et changez d'espace de travail en un clic.
          </p>
        </div>
        <button
          onClick={() => {
            setTreeName("");
            setTreeDesc("");
            setIsCreateModalOpen(true);
          }}
          className="btn btn-primary"
        >
          ➕ Créer un arbre
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(220, 38, 38, 0.15)",
            border: "1px solid rgba(220, 38, 38, 0.3)",
            color: "hsl(0, 85%, 70%)",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Grid of Trees */}
      {trees.length === 0 ? (
        <div
          className="glass"
          style={{
            padding: "4rem 2rem",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          <p style={{ fontSize: "1.1rem" }}>Vous n'avez pas encore d'arbre généalogique.</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
            style={{ marginTop: "1.5rem" }}
          >
            Créer votre premier arbre
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {trees.map((tree) => (
            <div
              key={tree.id}
              className="card glass"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "220px",
                position: "relative",
              }}
            >
              <div>
                <h3
                  className="title-font"
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: 700,
                    color: "var(--accent-gold)",
                    marginBottom: "0.5rem",
                  }}
                >
                  🌿 {tree.name}
                </h3>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    lineHeight: "1.4",
                    marginBottom: "1.5rem",
                    minHeight: "40px",
                  }}
                >
                  {tree.description || "Aucune description fournie."}
                </p>
              </div>

              <div>
                {/* Stats */}
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    marginBottom: "1.5rem",
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: "0.75rem",
                  }}
                >
                  <span>📇 {tree._count?.people || 0} personnes</span>
                  <span>🤝 {tree._count?.unions || 0} unions</span>
                  <span>📷 {tree._count?.media || 0} médias</span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => handleSetActiveTree(tree.id)}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                  >
                    Ouvrir
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTree(tree);
                      setTreeName(tree.name);
                      setTreeDesc(tree.description || "");
                      setIsEditModalOpen(true);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: "0.5rem" }}
                    title="Modifier"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteTree(tree.id, tree.name)}
                    className="btn btn-secondary"
                    style={{ padding: "0.5rem", color: "hsl(0, 80%, 65%)" }}
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            className="glass"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "2rem",
              animation: "scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <h2 className="title-font" style={{ marginBottom: "1.5rem", color: "var(--accent-gold)" }}>
              ➕ Créer un nouvel arbre
            </h2>

            <form onSubmit={handleCreateTree}>
              <div className="input-group">
                <label className="input-label">Nom de l'arbre</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Famille Joseph"
                  value={treeName}
                  onChange={(e) => setTreeName(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: "2rem" }}>
                <label className="input-label">Description (optionnelle)</label>
                <textarea
                  className="input-field"
                  placeholder="Généalogie ascendante et descendante..."
                  value={treeDesc}
                  onChange={(e) => setTreeDesc(e.target.value)}
                  disabled={submitting}
                  style={{ minHeight: "100px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Création..." : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            className="glass"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "2rem",
              animation: "scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <h2 className="title-font" style={{ marginBottom: "1.5rem", color: "var(--accent-gold)" }}>
              ✏️ Modifier l'arbre
            </h2>

            <form onSubmit={handleEditTree}>
              <div className="input-group">
                <label className="input-label">Nom de l'arbre</label>
                <input
                  type="text"
                  className="input-field"
                  value={treeName}
                  onChange={(e) => setTreeName(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: "2rem" }}>
                <label className="input-label">Description (optionnelle)</label>
                <textarea
                  className="input-field"
                  value={treeDesc}
                  onChange={(e) => setTreeDesc(e.target.value)}
                  disabled={submitting}
                  style={{ minHeight: "100px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedTree(null);
                  }}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Modification..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
