"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError("Le jeton de réinitialisation est absent. Veuillez utiliser le lien reçu par email.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue lors de la réinitialisation.");
      } else {
        setSuccess(data.message || "Votre mot de passe a été réinitialisé avec succès.");
        setTimeout(() => {
          router.push("/login?clear=true");
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
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
          🎉 {success} Redirection vers la page de connexion...
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: "1.25rem" }}>
            <label className="input-label" htmlFor="newPassword">
              Nouveau mot de passe
            </label>
            <input
              id="newPassword"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
              placeholder="••••••••"
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
                Enregistrement...
              </>
            ) : (
              "Changer le mot de passe"
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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
            Définir un nouveau mot de passe
          </p>
        </div>

        <Suspense fallback={<div style={{ textAlign: "center", color: "var(--text-secondary)" }}>Chargement...</div>}>
          <ResetPasswordForm />
        </Suspense>

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
