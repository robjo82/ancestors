"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue lors de la demande.");
      } else {
        setSuccess(data.message || "Un email de réinitialisation vous a été envoyé.");
        setEmail("");
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
          maxWidth: "440px",
          padding: "2.5rem",
          animation: "scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            className="title-font"
            style={{
              fontSize: "2.2rem",
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
            Réinitialisation du mot de passe
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

        {success && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "hsl(140, 85%, 70%)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              fontSize: "0.9rem",
              marginBottom: "1.5rem",
              textAlign: "center",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            📧 {success}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="input-group" style={{ marginBottom: "2rem" }}>
              <label className="input-label" htmlFor="email">
                Adresse Email
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="votre.nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  Demande en cours...
                </>
              ) : (
                "Envoyer le lien de réinitialisation"
              )}
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: "2rem",
            textAlign: "center",
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
          }}
        >
          Retourner à la{" "}
          <Link
            href="/login"
            style={{
              color: "var(--accent-gold)",
              fontWeight: 600,
              textDecoration: "underline",
              transition: "var(--transition-fast)",
            }}
          >
            Connexion
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
