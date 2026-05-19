"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface PersonNode {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string | null;
  deathDate: string | null;
  occupation: string | null;
  avatarUrl: string | null;
  fatherId: string | null;
  motherId: string | null;
}

interface UnionNode {
  id: string;
  partner1Id: string;
  partner2Id: string;
  weddingDate: string | null;
  weddingPlace: string | null;
}

interface InteractiveTreeClientProps {
  people: PersonNode[];
  unions: UnionNode[];
}

interface TreeNode {
  person: PersonNode;
  x: number;
  y: number;
  generation: number;
}

interface TreeLink {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color?: string;
}

export default function InteractiveTreeClient({ people, unions }: InteractiveTreeClientProps) {
  const router = useRouter();
  
  // États de l'arbre
  const [focusId, setFocusId] = useState<string>("");
  const [layoutMode, setLayoutMode] = useState<"pedigree" | "descendants" | "relative">("relative");
  const [maxGenerations, setMaxGenerations] = useState<number>(4);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearchList, setShowSearchList] = useState<boolean>(false);
  
  // États de navigation (Zoom & Pan)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 200, y: 150 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Définir la personne initiale par défaut si aucune n'est sélectionnée
  useEffect(() => {
    if (people.length > 0 && !focusId) {
      // Trouver la personne avec le plus de relations ou la plus jeune comme point de départ
      const firstPerson = people.find(p => !p.fatherId && !p.motherId) || people[0];
      setFocusId(firstPerson.id);
    }
  }, [people, focusId]);

  // Réinitialiser la caméra au centre
  const resetCamera = () => {
    setZoom(1);
    setPan({ x: 150, y: 100 });
  };

  if (people.length === 0) {
    return (
      <div className="card glass" style={{ margin: "auto", textAlign: "center", padding: "4rem", maxWidth: "600px" }}>
        <span style={{ fontSize: "4rem" }}>🌿</span>
        <h2 className="title-font" style={{ fontSize: "1.8rem", color: "var(--accent-gold)", marginTop: "1rem" }}>
          Votre arbre est vide
        </h2>
        <p style={{ color: "var(--text-secondary)", margin: "1rem 0" }}>
          Importez un fichier GEDCOM pour charger automatiquement votre généalogie ou créez manuellement un premier ancêtre.
        </p>
        <a href="/import-export" className="btn btn-accent" style={{ marginTop: "1rem" }}>
          📤 Importer un GEDCOM
        </a>
      </div>
    );
  }

  const focusPerson = people.find(p => p.id === focusId) || people[0];

  // ==========================================
  // CALCUL DES LAYOUTS (COORDONNÉES DES NŒUDS)
  // ==========================================

  const CARD_WIDTH = 220;
  const CARD_HEIGHT = 90;

  const nodes: TreeNode[] = [];
  const links: TreeLink[] = [];

  if (focusPerson) {
    // ------------------------------------------
    // 1. LAYOUT : ARBRE D'ASCENDANCE (PEDIGREE)
    // ------------------------------------------
    if (layoutMode === "pedigree") {
      const gWidth = 280; // Distance horizontale entre générations
      
      const buildPedigree = (personId: string, gen: number, startY: number, heightSpan: number) => {
        if (gen >= maxGenerations) return;
        const person = people.find(p => p.id === personId);
        if (!person) return;
        
        const nodeX = gen * gWidth;
        const nodeY = startY;
        
        nodes.push({ person, x: nodeX, y: nodeY, generation: gen });
        
        const halfSpan = heightSpan / 2;
        
        if (person.fatherId) {
          const fatherY = nodeY - halfSpan;
          buildPedigree(person.fatherId, gen + 1, fatherY, halfSpan);
          // Lien enfant -> père
          links.push({
            fromX: nodeX + CARD_WIDTH,
            fromY: nodeY + CARD_HEIGHT / 2,
            toX: nodeX + gWidth,
            toY: fatherY + CARD_HEIGHT / 2,
            color: "rgba(59, 130, 246, 0.4)",
          });
        }
        
        if (person.motherId) {
          const motherY = nodeY + halfSpan;
          buildPedigree(person.motherId, gen + 1, motherY, halfSpan);
          // Lien enfant -> mère
          links.push({
            fromX: nodeX + CARD_WIDTH,
            fromY: nodeY + CARD_HEIGHT / 2,
            toX: nodeX + gWidth,
            toY: motherY + CARD_HEIGHT / 2,
            color: "rgba(236, 72, 153, 0.4)",
          });
        }
      };
      
      buildPedigree(focusPerson.id, 0, 300, 320);
    } 
    // ------------------------------------------
    // 2. LAYOUT : ARBRE DE DESCENDANCE
    // ------------------------------------------
    else if (layoutMode === "descendants") {
      const gHeight = 180; // Distance verticale entre générations
      
      // Construire la descendance récursivement
      const buildDescendants = (personId: string, gen: number, startX: number, widthSpan: number) => {
        if (gen >= 4) return; // Limiter à 4 générations pour la lisibilité
        const person = people.find(p => p.id === personId);
        if (!person) return;
        
        const nodeX = startX;
        const nodeY = gen * gHeight;
        
        nodes.push({ person, x: nodeX, y: nodeY, generation: gen });
        
        // Trouver tous les enfants de cette personne
        const childList = people.filter(p => p.fatherId === personId || p.motherId === personId);
        if (childList.length === 0) return;
        
        const childSpan = widthSpan / childList.length;
        
        childList.forEach((child, idx) => {
          const childX = startX - widthSpan / 2 + (idx + 0.5) * childSpan;
          buildDescendants(child.id, gen + 1, childX, childSpan * 0.95);
          
          // Lien parent -> enfant
          links.push({
            fromX: nodeX + CARD_WIDTH / 2,
            fromY: nodeY + CARD_HEIGHT,
            toX: childX + CARD_WIDTH / 2,
            toY: (gen + 1) * gHeight,
            color: child.gender === "M" ? "rgba(59, 130, 246, 0.3)" : "rgba(236, 72, 153, 0.3)",
          });
        });
      };
      
      buildDescendants(focusPerson.id, 0, 400, 800);
    } 
    // ------------------------------------------
    // 3. LAYOUT : VUE RELATIVE (FOCUS INDIVIDU)
    // ------------------------------------------
    else {
      // Centre de la vue
      const centerX = 350;
      const centerY = 250;
      
      // A. L'individu ciblé (Focus)
      nodes.push({ person: focusPerson, x: centerX, y: centerY, generation: 0 });
      
      // B. Ses parents au-dessus
      if (focusPerson.fatherId) {
        const father = people.find(p => p.id === focusPerson.fatherId);
        if (father) {
          const fX = centerX - 130;
          const fY = centerY - 150;
          nodes.push({ person: father, x: fX, y: fY, generation: -1 });
          links.push({ fromX: fX + CARD_WIDTH / 2, fromY: fY + CARD_HEIGHT, toX: centerX + CARD_WIDTH / 3, toY: centerY, color: "rgba(59, 130, 246, 0.4)" });
        }
      }
      
      if (focusPerson.motherId) {
        const mother = people.find(p => p.id === focusPerson.motherId);
        if (mother) {
          const mX = centerX + 130;
          const mY = centerY - 150;
          nodes.push({ person: mother, x: mX, y: mY, generation: -1 });
          links.push({ fromX: mX + CARD_WIDTH / 2, fromY: mY + CARD_HEIGHT, toX: centerX + (CARD_WIDTH * 2) / 3, toY: centerY, color: "rgba(236, 72, 153, 0.4)" });
        }
      }
      
      // C. Ses conjoints à côté (droite)
      const myUnions = unions.filter(u => u.partner1Id === focusPerson.id || u.partner2Id === focusPerson.id);
      myUnions.forEach((u, idx) => {
        const partnerId = u.partner1Id === focusPerson.id ? u.partner2Id : u.partner1Id;
        const partner = people.find(p => p.id === partnerId);
        if (partner) {
          const pX = centerX + 260 * (idx + 1);
          const pY = centerY;
          nodes.push({ person: partner, x: pX, y: pY, generation: 0 });
          // Lien de mariage (or)
          links.push({
            fromX: centerX + CARD_WIDTH,
            fromY: centerY + CARD_HEIGHT / 2,
            toX: pX,
            toY: pY + CARD_HEIGHT / 2,
            color: "var(--accent-gold)",
          });
        }
      });
      
      // D. Ses enfants au-dessous
      const myChildren = people.filter(p => p.fatherId === focusPerson.id || p.motherId === focusPerson.id);
      const chOffset = 250;
      myChildren.forEach((c, idx) => {
        const cX = centerX + (idx - (myChildren.length - 1) / 2) * chOffset;
        const cY = centerY + 160;
        nodes.push({ person: c, x: cX, y: cY, generation: 1 });
        // Lien focus -> enfant
        links.push({
          fromX: centerX + CARD_WIDTH / 2,
          fromY: centerY + CARD_HEIGHT,
          toX: cX + CARD_WIDTH / 2,
          toY: cY,
          color: c.gender === "M" ? "rgba(59, 130, 246, 0.3)" : "rgba(236, 72, 153, 0.3)",
        });
      });
      
      // E. Ses frères et sœurs (fratrie) à gauche
      const siblings = people.filter(p => 
        p.id !== focusPerson.id && 
        ((focusPerson.fatherId && p.fatherId === focusPerson.fatherId) || 
         (focusPerson.motherId && p.motherId === focusPerson.motherId))
      );
      siblings.forEach((s, idx) => {
        const sX = centerX - 260;
        const sY = centerY + (idx - (siblings.length - 1) / 2) * 110;
        nodes.push({ person: s, x: sX, y: sY, generation: 0 });
        // Lien vers le focus (gris discret)
        links.push({
          fromX: sX + CARD_WIDTH,
          fromY: sY + CARD_HEIGHT / 2,
          toX: centerX,
          toY: centerY + CARD_HEIGHT / 2,
          color: "rgba(255,255,255,0.12)",
        });
      });
    }
  }

  // ==========================================
  // GESTION DES EVENEMENTS SOURIS (DRAG & ZOOM)
  // ==========================================

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomIntensity = 0.05;
    const scrollDirection = e.deltaY < 0 ? 1 : -1;
    const newZoom = Math.min(Math.max(zoom + scrollDirection * zoomIntensity * zoom, 0.2), 3);
    setZoom(newZoom);
  };

  // Recherche dans l'arbre
  const filteredSearchList = searchQuery 
    ? people.filter(p => 
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", background: "var(--bg-primary)" }}>
      
      {/* 1. PANNEAU DE RECHERCHE LATÉRAL & CONTRÔLES */}
      <div 
        className="glass" 
        style={{ 
          position: "absolute", 
          top: "1rem", 
          left: "1rem", 
          zIndex: 10, 
          padding: "1rem", 
          width: "300px", 
          display: "flex", 
          flexDirection: "column", 
          gap: "1rem" 
        }}
      >
        <div style={{ position: "relative" }}>
          <input 
            type="text" 
            placeholder="🔍 Centrer sur un ancêtre..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSearchList(true); }}
            onFocus={() => setShowSearchList(true)}
            className="input-field"
            style={{ width: "100%", paddingRight: "2rem", fontSize: "0.85rem" }}
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(""); setShowSearchList(false); }}
              style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", cursor: "pointer" }}
            >
              ✕
            </button>
          )}

          {showSearchList && filteredSearchList.length > 0 && (
            <div 
              className="card" 
              style={{ 
                position: "absolute", 
                top: "100%", 
                left: 0, 
                width: "100%", 
                background: "var(--bg-secondary)", 
                border: "1px solid var(--border-subtle)", 
                borderRadius: "8px", 
                marginTop: "0.25rem",
                maxHeight: "220px",
                overflowY: "auto",
                padding: "0.25rem",
                boxShadow: "0 10px 20px rgba(0,0,0,0.5)"
              }}
            >
              {filteredSearchList.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setFocusId(p.id); setSearchQuery(""); setShowSearchList(false); }}
                  className="list-item-hover"
                  style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    width: "100%", 
                    padding: "0.5rem 0.75rem", 
                    textAlign: "left", 
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    color: "var(--text-primary)"
                  }}
                >
                  <span>{p.firstName} {p.lastName.toUpperCase()}</span>
                  <span style={{ color: "var(--text-muted)" }}>{p.birthDate ? p.birthDate.substring(0,4) : ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sélection du type d'arbre */}
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label" style={{ fontSize: "0.75rem" }}>Format d'Arbre</label>
          <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-tertiary)", borderRadius: "8px", padding: "0.25rem" }}>
            <button 
              onClick={() => setLayoutMode("relative")}
              style={{ 
                flex: 1, 
                padding: "0.4rem", 
                fontSize: "0.75rem", 
                borderRadius: "6px", 
                fontWeight: 600,
                background: layoutMode === "relative" ? "var(--accent-emerald)" : "transparent",
                color: layoutMode === "relative" ? "white" : "var(--text-secondary)"
              }}
            >
              ⚖️ Famille
            </button>
            <button 
              onClick={() => setLayoutMode("pedigree")}
              style={{ 
                flex: 1, 
                padding: "0.4rem", 
                fontSize: "0.75rem", 
                borderRadius: "6px", 
                fontWeight: 600,
                background: layoutMode === "pedigree" ? "var(--accent-emerald)" : "transparent",
                color: layoutMode === "pedigree" ? "white" : "var(--text-secondary)"
              }}
            >
              🌿 Ascendance
            </button>
            <button 
              onClick={() => setLayoutMode("descendants")}
              style={{ 
                flex: 1, 
                padding: "0.4rem", 
                fontSize: "0.75rem", 
                borderRadius: "6px", 
                fontWeight: 600,
                background: layoutMode === "descendants" ? "var(--accent-emerald)" : "transparent",
                color: layoutMode === "descendants" ? "white" : "var(--text-secondary)"
              }}
            >
              🍁 Descendance
            </button>
          </div>
        </div>

        {/* Option générations (uniquement pour ascendance) */}
        {layoutMode === "pedigree" && (
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" style={{ fontSize: "0.75rem" }}>Nombre de Générations : {maxGenerations}</label>
            <input 
              type="range" 
              min="3" 
              max="6" 
              value={maxGenerations} 
              onChange={(e) => setMaxGenerations(parseInt(e.target.value))}
              style={{ accentColor: "var(--accent-emerald)", cursor: "pointer", width: "100%" }}
            />
          </div>
        )}

        {/* Caméra boutons rapides */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={resetCamera} className="btn btn-secondary" style={{ flex: 1, padding: "0.4rem", fontSize: "0.75rem" }}>
            🎯 Recadrer
          </button>
          <button onClick={() => setZoom(z => Math.min(z + 0.1, 3))} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}>
            ➕
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.2))} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}>
            ➖
          </button>
        </div>
      </div>

      {/* 2. LE CANVAS SVG DE RENDU DE L'ARBRE */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ 
          flex: 1, 
          height: "100%", 
          cursor: isDragging ? "grabbing" : "grab", 
          outline: "none", 
          userSelect: "none" 
        }}
      >
        <svg 
          width="100%" 
          height="100%" 
          style={{ pointerEvents: "none" }}
        >
          {/* Conteneur principal transformable pour le Zoom et Pan */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} style={{ pointerEvents: "all" }}>
            
            {/* Rendu des lignes de liaison */}
            {links.map((link, idx) => (
              <g key={`l-${idx}`}>
                {/* Ligne coudée élégante (chemin orthogonal ou direct) */}
                <path 
                  d={`M ${link.fromX} ${link.fromY} L ${(link.fromX + link.toX) / 2} ${link.fromY} L ${(link.fromX + link.toX) / 2} ${link.toY} L ${link.toX} ${link.toY}`}
                  fill="none" 
                  stroke={link.color || "rgba(255, 255, 255, 0.18)"} 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  style={{ transition: "stroke 0.2s" }}
                />
              </g>
            ))}

            {/* Rendu des nœuds (Personnes) */}
            {nodes.map(({ person, x, y }) => {
              const isFocused = person.id === focusId;
              
              // Déterminer les couleurs de bordure/sexe
              const borderStyle = isFocused ? "2px solid var(--accent-gold)" :
                                  person.gender === "M" ? "2px solid rgba(59, 130, 246, 0.3)" : 
                                  person.gender === "F" ? "2px solid rgba(236, 72, 153, 0.3)" : 
                                  "2px solid rgba(156, 163, 175, 0.3)";
                                  
              const genderTagColor = person.gender === "M" ? "rgba(59, 130, 246, 0.12)" : 
                                     person.gender === "F" ? "rgba(236, 72, 153, 0.12)" : 
                                     "rgba(156, 163, 175, 0.12)";

              return (
                <g key={person.id} transform={`translate(${x}, ${y})`}>
                  {/* foreignObject permet d'intégrer du HTML/CSS moderne dans un arbre SVG */}
                  <foreignObject 
                    width={CARD_WIDTH} 
                    height={CARD_HEIGHT}
                  >
                    <div 
                      className={`card glass`}
                      style={{
                        padding: "0.5rem 0.75rem",
                        height: "100%",
                        width: "100%",
                        border: borderStyle,
                        borderRadius: "10px",
                        background: genderTagColor,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        boxShadow: isFocused ? "0 0 15px var(--accent-gold-glow)" : "0 4px 12px rgba(0,0,0,0.2)",
                        transition: "transform 0.15s ease",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusId(person.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        router.push(`/people/${person.id}`);
                      }}
                    >
                      {/* En-tête de la carte */}
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        {person.avatarUrl ? (
                          <img 
                            src={person.avatarUrl} 
                            alt="" 
                            style={{ width: "36px", height: "36px", borderRadius: "18px", objectFit: "cover" }}
                          />
                        ) : (
                          <span style={{ fontSize: "1.4rem" }}>
                            {person.gender === "M" ? "👨‍" : person.gender === "F" ? "👩" : "👤"}
                          </span>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                          <strong 
                            className="title-font"
                            style={{ 
                              fontSize: "0.85rem", 
                              fontWeight: 700, 
                              color: "var(--text-primary)",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {person.firstName}
                          </strong>
                          <strong 
                            className="title-font"
                            style={{ 
                              fontSize: "0.85rem", 
                              fontWeight: 800, 
                              color: isFocused ? "var(--accent-gold)" : "var(--text-primary)",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                              whiteSpace: "nowrap",
                              marginTop: "-0.15rem"
                            }}
                          >
                            {person.lastName?.toUpperCase()}
                          </strong>
                        </div>
                      </div>

                      {/* Corps (Métier & dates) */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: "0.75rem" }}>
                        <span style={{ color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "100px" }}>
                          {person.occupation || "—"}
                        </span>
                        <strong style={{ color: "var(--text-secondary)" }}>
                          {person.birthDate ? person.birthDate.substring(0, 4) : "????"} - {person.deathDate ? person.deathDate.substring(0, 4) : person.gender === "M" ? "Vivant" : "Vivante"}
                        </strong>
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            })}

          </g>
        </svg>
      </div>

      {/* 3. AIDE CONTEXTUELLE FLOTTANTE */}
      <div 
        className="glass" 
        style={{ 
          position: "absolute", 
          bottom: "1rem", 
          right: "1rem", 
          padding: "0.5rem 1rem", 
          fontSize: "0.8rem", 
          color: "var(--text-secondary)",
          pointerEvents: "none"
        }}
      >
        💡 <strong>Clic :</strong> Sélectionner • <strong>Double-clic :</strong> Ouvrir Profil • <strong>Molette :</strong> Zoomer • <strong>Glisser :</strong> Déplacer
      </div>

    </div>
  );
}
