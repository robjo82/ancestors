"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface Tree {
  id: string;
  name: string;
  description: string | null;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  isAdmin?: boolean;
}

interface NavbarClientProps {
  user: User;
  trees: Tree[];
  activeTreeId: string | null;
}

export default function NavbarClient({ user, trees, activeTreeId }: NavbarClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTree = trees.find((t) => t.id === activeTreeId) || trees[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Theme handling
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      const initialTheme = prefersLight ? "light" : "dark";
      setTheme(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const handleSwitchTree = async (treeId: string) => {
    setDropdownOpen(false);
    try {
      const response = await fetch("/api/trees/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ treeId }),
      });

      if (response.ok) {
        router.refresh();
        // Force full refresh to clear any cached page data
        window.location.reload();
      }
    } catch (err) {
      console.error("Error switching tree:", err);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) {
        router.refresh();
        router.push("/login");
      }
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  return (
    <header className="navbar glass" style={{ gap: "1rem", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        {/* Logo */}
        <Link href="/" className="navbar-logo">
          🌳 <span>Ancestors</span>
        </Link>

        {/* Tree Selector Dropdown */}
        {trees.length > 0 && activeTree && (
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.45rem 1rem",
                borderRadius: "20px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "var(--transition-fast)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-gold)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            >
              🌿 {activeTree.name}
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{dropdownOpen ? "▲" : "▼"}</span>
            </button>

            {dropdownOpen && (
              <div
                className="glass"
                style={{
                  position: "absolute",
                  top: "105%",
                  left: 0,
                  zIndex: 200,
                  width: "240px",
                  padding: "0.5rem 0",
                  borderRadius: "12px",
                  animation: "fadeIn 0.2s ease-out",
                }}
              >
                <div
                  style={{
                    padding: "0.4rem 1rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-muted)",
                    borderBottom: "1px solid var(--border-subtle)",
                    marginBottom: "0.3rem",
                  }}
                >
                  Mes Arbres
                </div>
                {trees.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSwitchTree(t.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "0.6rem 1rem",
                      fontSize: "0.9rem",
                      color: t.id === activeTree.id ? "var(--accent-gold)" : "var(--text-primary)",
                      fontWeight: t.id === activeTree.id ? 700 : 500,
                      cursor: "pointer",
                      background: "transparent",
                      transition: "var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-tertiary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {t.id === activeTree.id ? "▶ " : ""}
                    {t.name}
                  </button>
                ))}
                <div
                  style={{
                    borderTop: "1px solid var(--border-subtle)",
                    marginTop: "0.3rem",
                    paddingTop: "0.3rem",
                  }}
                >
                  <Link
                    href="/trees"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: "block",
                      padding: "0.6rem 1rem",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--accent-emerald)",
                      transition: "var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-tertiary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    ⚙️ Gérer les arbres
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="navbar-links" style={{ display: "flex", gap: "0.5rem" }}>
        <Link href="/" className={`navbar-link ${pathname === "/" ? "active" : ""}`}>
          📊 Tableau
        </Link>
        <Link href="/tree" className={`navbar-link ${pathname === "/tree" ? "active" : ""}`}>
          🌿 Arbre
        </Link>
        <Link href="/people" className={`navbar-link ${pathname.startsWith("/people") ? "active" : ""}`}>
          📇 Annuaire
        </Link>
        <Link href="/statistics" className={`navbar-link ${pathname === "/statistics" ? "active" : ""}`}>
          📈 Stats
        </Link>
        <Link href="/import-export" className={`navbar-link ${pathname === "/import-export" ? "active" : ""}`}>
          📤 GEDCOM
        </Link>
        {user.isAdmin && (
          <Link href="/admin" className={`navbar-link ${pathname.startsWith("/admin") ? "active" : ""}`}>
            🛠️ Admin
          </Link>
        )}
      </nav>

      {/* User Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginLeft: "auto" }}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            fontSize: "1.2rem",
            padding: "0.5rem",
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "38px",
            height: "38px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            transition: "var(--transition-fast)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
          title={theme === "dark" ? "Mode Clair" : "Mode Sombre"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* User Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.3rem 0.8rem",
            borderRadius: "20px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              background: "var(--accent-gold)",
              color: "#000",
              fontWeight: 700,
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {user.name ? user.name.substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase()}
          </div>
          <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.name || user.email}
          </span>
        </div>

        {/* Settings Button */}
        <Link
          href="/settings"
          className="btn btn-secondary"
          style={{
            padding: "0.45rem 0.8rem",
            fontSize: "0.85rem",
            borderRadius: "8px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            textDecoration: "none",
          }}
          title="Paramètres de compte"
        >
          ⚙️
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{
            padding: "0.45rem 1rem",
            fontSize: "0.85rem",
            borderRadius: "8px",
            height: "36px",
          }}
        >
          🚪 Déconnexion
        </button>
      </div>
    </header>
  );
}
