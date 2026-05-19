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
  
  // Page states
  const [loading, setLoading] = useState(true);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ text: "", type: "" }); // type: 'success' | 'error'
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" }); // type: 'success' | 'error'

  useEffect(() => {
    fetchProfile();
  }, []);

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
      </div>
    </div>
  );
}
