"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
}

export default function SettingsPage() {
  const router = useRouter();
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // FamilySearch state
  const [fsConnected, setFsConnected] = useState(false);
  const [fsChecking, setFsChecking] = useState(true);
  const [fsDisconnecting, setFsDisconnecting] = useState(false);

  // Page states
  const [loading, setLoading] = useState(true);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: "", type: "" }); // type: 'success' | 'error'
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" }); // type: 'success' | 'error'

  // Feature Request state
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureCategory, setFeatureCategory] = useState("other");
  const [featureDescription, setFeatureDescription] = useState("");
  const [featureSubmitting, setFeatureSubmitting] = useState(false);
  const [featureMessage, setFeatureMessage] = useState({ text: "", type: "" }); // type: 'success' | 'error'

  useEffect(() => {
    fetchProfile();
    fetchFamilySearchStatus();
  }, []);

  const fetchFamilySearchStatus = async () => {
    try {
      const response = await fetch("/api/auth/familysearch/status");
      if (response.ok) {
        const data = await response.json();
        setFsConnected(data.connected);
      }
    } catch (err) {
      console.error("Error fetching FamilySearch status:", err);
    } finally {
      setFsChecking(false);
    }
  };

  const handleFsDisconnect = async () => {
    if (!confirm("Voulez-vous vraiment déconnecter votre compte FamilySearch ?")) {
      return;
    }
    setFsDisconnecting(true);
    try {
      const response = await fetch("/api/auth/familysearch/disconnect", { method: "POST" });
      if (response.ok) {
        setFsConnected(false);
        setProfileMessage({ text: "Compte FamilySearch déconnecté avec succès.", type: "success" });
      } else {
        setProfileMessage({ text: "Erreur lors de la déconnexion de FamilySearch.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setProfileMessage({ text: "Erreur réseau de déconnexion.", type: "error" });
    } finally {
      setFsDisconnecting(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setProfile(data.user);
          setName(data.user.name || "");
          setEmail(data.user.email || "");
        } else {
          router.push("/login");
        }
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage({ text: "", type: "" });
    setProfileSubmitting(true);

    try {
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json();

      if (response.ok) {
        setProfileMessage({ text: data.message || "Profil mis à jour avec succès !", type: "success" });
        if (data.user) {
          setProfile(data.user);
          setName(data.user.name || "");
          setEmail(data.user.email || "");
        }
        router.refresh();
      } else {
        setProfileMessage({ text: data.error || "Une erreur est survenue.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setProfileMessage({ text: "Erreur de connexion avec le serveur.", type: "error" });
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage({ text: "", type: "" });

    if (!currentPassword) {
      setPasswordMessage({ text: "Le mot de passe actuel est requis.", type: "error" });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ text: "Le nouveau mot de passe doit faire au moins 6 caractères.", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "La confirmation du mot de passe ne correspond pas.", type: "error" });
      return;
    }

    setPasswordSubmitting(true);

    try {
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordMessage({ text: data.message || "Mot de passe changé avec succès !", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMessage({ text: data.error || "Une erreur est survenue.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setPasswordMessage({ text: "Erreur de connexion avec le serveur.", type: "error" });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleFeatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeatureMessage({ text: "", type: "" });

    if (!featureTitle.trim() || !featureDescription.trim()) {
      setFeatureMessage({ text: "Le titre et la description sont requis.", type: "error" });
      return;
    }

    setFeatureSubmitting(true);

    try {
      const response = await fetch("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: featureTitle,
          category: featureCategory,
          description: featureDescription,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFeatureMessage({
          text: "Votre suggestion de fonctionnalité a été soumise avec succès !",
          type: "success",
        });
        setFeatureTitle("");
        setFeatureCategory("other");
        setFeatureDescription("");
      } else {
        setFeatureMessage({ text: data.error || "Une erreur est survenue.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setFeatureMessage({ text: "Erreur de connexion avec le serveur.", type: "error" });
    } finally {
      setFeatureSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
        <p>Chargement de vos paramètres...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", animation: "fadeIn 0.4s ease-out" }}>
      {/* Title Section */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 className="title-font" style={{ fontSize: "2.2rem", fontWeight: 800, margin: 0 }}>
          ⚙️ Paramètres
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          Gérez vos informations personnelles et configurez la sécurité de votre compte Ancestors.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Profile Card */}
        <div className="card glass" style={{ padding: "2rem" }}>
          <h2
            className="title-font"
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "var(--accent-gold)",
              marginBottom: "1.5rem",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            👤 Informations de profil
          </h2>

          {profileMessage.text && (
            <div
              style={{
                background: profileMessage.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                border: profileMessage.type === "success" ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                color: profileMessage.type === "success" ? "hsl(142, 70%, 75%)" : "hsl(0, 85%, 75%)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                marginBottom: "1.5rem",
                fontSize: "0.9rem"
              }}
            >
              {profileMessage.type === "success" ? "✅" : "⚠️"} {profileMessage.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div className="input-group">
              <label className="input-label">Nom complet</label>
              <input
                type="text"
                className="input-field"
                placeholder="Votre nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={profileSubmitting}
              />
            </div>

            <div className="input-group" style={{ marginBottom: "2rem" }}>
              <label className="input-label">Adresse email</label>
              <input
                type="email"
                className="input-field"
                placeholder="nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={profileSubmitting}
                required
              />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "block" }}>
                Note : Si vous modifiez votre adresse email, vous devrez confirmer votre mot de passe pour des raisons de sécurité.
              </span>
            </div>

            {email.trim().toLowerCase() !== (profile?.email || "").toLowerCase() && (
              <div
                className="input-group"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px dashed var(--border-subtle)",
                  padding: "1rem",
                  borderRadius: "8px",
                  marginBottom: "1.5rem"
                }}
              >
                <label className="input-label" style={{ color: "var(--accent-gold)" }}>
                  🔑 Mot de passe actuel requis
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Entrez votre mot de passe pour valider le changement d'email"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={profileSubmitting}>
                {profileSubmitting ? "Enregistrement..." : "Sauvegarder"}
              </button>
            </div>
          </form>
        </div>

        {/* FamilySearch Connection Card */}
        <div className="card glass" style={{ padding: "2rem" }}>
          <h2
            className="title-font"
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "var(--accent-gold)",
              marginBottom: "1.5rem",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            🌍 Intégration FamilySearch
          </h2>

          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
            Liez votre compte FamilySearch pour rechercher directement des actes généalogiques officiels internationaux et importer des profils d'ancêtres complets dans votre arbre local en un seul clic.
          </p>

          {fsChecking ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic" }}>
              ⏳ Vérification du statut de connexion...
            </div>
          ) : fsConnected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "hsl(142, 70%, 75%)",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <span>✅</span>
                <strong>Votre compte est actuellement connecté à FamilySearch.</strong>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Vous pouvez dès à présent utiliser l'onglet de recherche FamilySearch sur n'importe quel profil d'ancêtre de votre arbre.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "0.5rem" }}>
                <button
                  onClick={handleFsDisconnect}
                  className="btn btn-secondary"
                  style={{ borderColor: "rgba(239, 68, 68, 0.3)", color: "hsl(0, 85%, 75%)" }}
                  disabled={fsDisconnecting}
                >
                  {fsDisconnecting ? "Déconnexion..." : "🔴 Déconnecter mon compte"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px dashed var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "1rem",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)"
                }}
              >
                ℹ️ Non connecté. Pour activer la recherche directe, cliquez sur le bouton ci-dessous. Vous serez redirigé vers l'interface de connexion sécurisée de FamilySearch.
              </div>
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "0.5rem" }}>
                <a
                  href="/api/auth/familysearch/login"
                  className="btn btn-primary"
                  style={{ textDecoration: "none" }}
                >
                  🔗 Connecter mon compte FamilySearch
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Password Card */}
        <div className="card glass" style={{ padding: "2rem" }}>
          <h2
            className="title-font"
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "var(--accent-gold)",
              marginBottom: "1.5rem",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            🔒 Sécurité & Mot de passe
          </h2>

          {passwordMessage.text && (
            <div
              style={{
                background: passwordMessage.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                border: passwordMessage.type === "success" ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                color: passwordMessage.type === "success" ? "hsl(142, 70%, 75%)" : "hsl(0, 85%, 75%)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                marginBottom: "1.5rem",
                fontSize: "0.9rem"
              }}
            >
              {passwordMessage.type === "success" ? "✅" : "⚠️"} {passwordMessage.text}
            </div>
          )}

          <form onSubmit={handleUpdatePassword}>
            <div className="input-group">
              <label className="input-label">Mot de passe actuel</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={passwordSubmitting}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Nouveau mot de passe</label>
              <input
                type="password"
                className="input-field"
                placeholder="Au moins 6 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={passwordSubmitting}
              />
            </div>

            <div className="input-group" style={{ marginBottom: "2rem" }}>
              <label className="input-label">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                className="input-field"
                placeholder="Confirmez le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={passwordSubmitting}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={passwordSubmitting}>
                {passwordSubmitting ? "Modification..." : "Modifier le mot de passe"}
              </button>
            </div>
          </form>
        </div>

        {/* Suggest Feature Card */}
        <div className="card glass" style={{ padding: "2rem" }}>
          <h2
            className="title-font"
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "var(--accent-gold)",
              marginBottom: "1.5rem",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            💡 Suggérer une fonctionnalité
          </h2>

          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
            Une idée pour améliorer Ancestors ? Dites-nous ce que vous aimeriez voir ajouté dans les prochaines mises à jour de l'application !
          </p>

          {featureMessage.text && (
            <div
              style={{
                background: featureMessage.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                border: featureMessage.type === "success" ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                color: featureMessage.type === "success" ? "hsl(142, 70%, 75%)" : "hsl(0, 85%, 75%)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                marginBottom: "1.5rem",
                fontSize: "0.9rem"
              }}
            >
              {featureMessage.type === "success" ? "✅" : "⚠️"} {featureMessage.text}
            </div>
          )}

          <form onSubmit={handleFeatureSubmit}>
            <div className="input-group">
              <label className="input-label">Titre de la suggestion</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex : Recherche globale de doublons"
                value={featureTitle}
                onChange={(e) => setFeatureTitle(e.target.value)}
                disabled={featureSubmitting}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Catégorie</label>
              <select
                className="input-field"
                style={{ appearance: "none", cursor: "pointer" }}
                value={featureCategory}
                onChange={(e) => setFeatureCategory(e.target.value)}
                disabled={featureSubmitting}
              >
                <option value="ui">🖥️ Ergonomie & Interface</option>
                <option value="performance">⚡ Performance</option>
                <option value="import-export">📤 Import / Export GEDCOM</option>
                <option value="familysearch">🌍 FamilySearch & Actes publics</option>
                <option value="other">💡 Autre suggestion</option>
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: "2rem" }}>
              <label className="input-label">Description détaillée</label>
              <textarea
                className="input-field"
                style={{ minHeight: "120px", resize: "vertical", fontFamily: "inherit" }}
                placeholder="Expliquez en détail votre besoin, l'usage prévu et les bénéfices pour votre recherche..."
                value={featureDescription}
                onChange={(e) => setFeatureDescription(e.target.value)}
                disabled={featureSubmitting}
                required
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={featureSubmitting}>
                {featureSubmitting ? "Envoi en cours..." : "💡 Soumettre la suggestion"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
