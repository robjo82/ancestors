"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue lors de l'inscription.");
      } else {
        // Successful signup, redirect to dashboard
        router.refresh();
        router.push("/");
      }
    } catch (err) {
      console.error(err);
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100vw",
        background: "radial-gradient(circle at center, hsl(140, 20%, 8%) 0%, hsl(140, 20%, 4%) 100%)",
        padding: "1.5rem",
      }}
    >
      <div
        className="glass"
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "2.5rem",
          animation: "scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            className="title-font"
            style={{
              fontSize: "2.5rem",
              fontWeight: 800,
              color: "var(--accent-gold)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            🌳 <span>Ancestors</span>
          </h1>
          <p
            style={{
              fontSize: "0.95rem",
              color: "var(--text-secondary)",
              marginTop: "0.5rem",
            }}
          >
            Créez votre compte SaaS de généalogie gratuit.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(220, 38, 38, 0.15)",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              color: "hsl(0, 85%, 70%)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              fontSize: "0.9rem",
              marginBottom: "1.5rem",
              textAlign: "center",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div
          style={{
            background: "var(--accent-emerald-glow)",
            border: "1px solid var(--accent-emerald)",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
            marginBottom: "1.5rem",
            lineHeight: "1.4",
          }}
        >
          💡 <strong>Onboarding fluide :</strong> Si vous avez déjà créé des fiches d'ancêtres localement, elles seront automatiquement migrées et associées à votre nouvel arbre par défaut !
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="name">
              Nom complet
            </label>
            <input
              id="name"
              type="text"
              className="input-field"
              placeholder="Grand-père Henri"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="email">
              Adresse Email
            </label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="grandpere.henri@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="Au moins 6 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="input-group" style={{ marginBottom: "2rem" }}>
            <label className="input-label" htmlFor="confirmPassword">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="input-field"
              placeholder="Répétez le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.85rem",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "1.2rem",
                    height: "1.2rem",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Création en cours...
              </>
            ) : (
              "Créer un compte & Importer"
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "2rem",
            textAlign: "center",
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
          }}
        >
          Déjà inscrit ?{" "}
          <Link
            href="/login"
            style={{
              color: "var(--accent-gold)",
              fontWeight: 600,
              textDecoration: "underline",
              transition: "var(--transition-fast)",
            }}
          >
            Se connecter
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
