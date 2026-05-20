"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface PlaceInputProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

interface Commune {
  nom: string;
  codeDepartement: string;
}

export default function PlaceInput({
  name,
  value,
  onChange,
  placeholder = "ex: Paris, Lyon, Marseille...",
  className = "input-field",
  style,
}: PlaceInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const datalistId = `place-suggestions-${name}-${Math.random().toString(36).slice(2)}`;
  const datalistIdRef = useRef(datalistId);

  const fetchCommunes = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://geo.api.gouv.fr/communes?nom=${encoded}&limit=8&fields=nom,codeDepartement`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (!res.ok) return;
      const data: Commune[] = await res.json();
      // Format as "Nom (Dept)" for clarity
      const formatted = data.map(
        (c) => `${c.nom} (${c.codeDepartement}), France`
      );
      setSuggestions(formatted);
    } catch {
      // Silently ignore network errors (international places typed freely)
      setSuggestions([]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    // Debounce the API call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCommunes(val);
      setShowDropdown(true);
    }, 280);
  };

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setSuggestions([]);
    setShowDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleSuggestions = showDropdown ? suggestions : [];

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        className={className}
        style={style}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={visibleSuggestions.length > 0}
        aria-haspopup="listbox"
        role="combobox"
      />
      {visibleSuggestions.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-focus)",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            listStyle: "none",
            margin: 0,
            padding: "0.25rem 0",
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          {visibleSuggestions.map((s, i) => (
            <li
              key={i}
              role="option"
              aria-selected={false}
              onMouseDown={() => handleSelect(s)}
              style={{
                padding: "0.5rem 0.85rem",
                cursor: "pointer",
                fontSize: "0.875rem",
                color: "var(--text-primary)",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "transparent")
              }
            >
              📍 {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
