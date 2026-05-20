"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import QuickCreatePersonModal from "../components/QuickCreatePersonModal";

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
  
  // Nouveaux États pour Drag & Drop & Création rapide
  const [draggedPersonId, setDraggedPersonId] = useState<string>("");
  const [dragOverTarget, setDragOverTarget] = useState<{ id: string; type: "person" | "placeholder"; placeholderType?: "father" | "mother" | "spouse"; targetPersonId?: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [quickCreateModalOpen, setQuickCreateModalOpen] = useState(false);
  const [quickCreateConfig, setQuickCreateConfig] = useState<{ type: "father" | "mother" | "spouse" | "child"; initialGender: string; initialLastName: string; placeholderType?: "father" | "mother" | "spouse"; targetPersonId?: string }>({ type: "child", initialGender: "U", initialLastName: "" });
  const [relationChoiceModalOpen, setRelationChoiceModalOpen] = useState(false);
  const [relationChoiceConfig, setRelationChoiceConfig] = useState<{ sourcePersonId: string; targetPersonId: string; availableOptions: ("father" | "mother" | "spouse" | "child")[] } | null>(null);

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

  // Calculer la liste des personnes isolées (non reliées)
  const unlinkedPeople = people.filter(p => {
    const hasNoParents = !p.fatherId && !p.motherId;
    const isNotParent = !people.some(o => o.fatherId === p.id || o.motherId === p.id);
    const isNotInUnion = !unions.some(u => u.partner1Id === p.id || u.partner2Id === p.id);
    return hasNoParents && isNotParent && isNotInUnion;
  });

  const linkPeople = async (sourceId: string, targetId: string, relationType: "father" | "mother" | "spouse" | "child") => {
    try {
      if (relationType === "father" || relationType === "mother") {
        const parentField = relationType === "father" ? "fatherId" : "motherId";
        const res = await fetch(`/api/people/${targetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [parentField]: sourceId })
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Erreur de liaison");
        }
      } else if (relationType === "child") {
        const targetPerson = people.find(p => p.id === targetId);
        const parentField = targetPerson?.gender === "M" ? "fatherId" : "motherId";
        const res = await fetch(`/api/people/${sourceId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [parentField]: targetId })
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Erreur de liaison");
        }
      } else if (relationType === "spouse") {
        const res = await fetch("/api/unions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partner1Id: targetId,
            partner2Id: sourceId,
            type: "MARRIAGE"
          })
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Erreur de liaison");
        }
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion.");
    }
  };

  const handleDropOnPerson = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const sourcePerson = people.find(p => p.id === sourceId);
    const targetPerson = people.find(p => p.id === targetId);
    if (!sourcePerson || !targetPerson) return;

    const options: ("father" | "mother" | "spouse" | "child")[] = [];

    // Option Père
    if (!targetPerson.fatherId && (sourcePerson.gender === "M" || sourcePerson.gender === "U")) {
      options.push("father");
    }
    // Option Mère
    if (!targetPerson.motherId && (sourcePerson.gender === "F" || sourcePerson.gender === "U")) {
      options.push("mother");
    }
    // Option Conjoint
    options.push("spouse");
    // Option Enfant
    if (targetPerson.gender === "M" && !sourcePerson.fatherId) {
      options.push("child");
    } else if (targetPerson.gender === "F" && !sourcePerson.motherId) {
      options.push("child");
    } else if (targetPerson.gender === "U" && (!sourcePerson.fatherId || !sourcePerson.motherId)) {
      options.push("child");
    }

    setRelationChoiceConfig({
      sourcePersonId: sourceId,
      targetPersonId: targetId,
      availableOptions: options
    });
    setRelationChoiceModalOpen(true);
  };

  const handleQuickCreateSuccess = async (newPerson: any) => {
    if (quickCreateConfig.placeholderType && quickCreateConfig.targetPersonId) {
      const { placeholderType, targetPersonId } = quickCreateConfig;
      try {
        if (placeholderType === "father" || placeholderType === "mother") {
          const parentField = placeholderType === "father" ? "fatherId" : "motherId";
          await fetch(`/api/people/${targetPersonId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [parentField]: newPerson.id })
          });
        } else if (placeholderType === "spouse") {
          await fetch("/api/unions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              partner1Id: targetPersonId,
              partner2Id: newPerson.id,
              type: "MARRIAGE"
            })
          });
        }
      } catch (err) {
        console.error("Failed to link new person:", err);
      }
    }
    router.refresh();
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
  
  interface PlaceholderNode {
    type: "father" | "mother" | "spouse";
    targetPersonId: string;
    x: number;
    y: number;
  }
  const placeholders: PlaceholderNode[] = [];

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
        } else if (gen + 1 < maxGenerations) {
          const fatherY = nodeY - halfSpan;
          placeholders.push({ type: "father", targetPersonId: person.id, x: nodeX + gWidth, y: fatherY });
          links.push({
            fromX: nodeX + CARD_WIDTH,
            fromY: nodeY + CARD_HEIGHT / 2,
            toX: nodeX + gWidth,
            toY: fatherY + CARD_HEIGHT / 2,
            color: "rgba(59, 130, 246, 0.12)",
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
        } else if (gen + 1 < maxGenerations) {
          const motherY = nodeY + halfSpan;
          placeholders.push({ type: "mother", targetPersonId: person.id, x: nodeX + gWidth, y: motherY });
          links.push({
            fromX: nodeX + CARD_WIDTH,
            fromY: nodeY + CARD_HEIGHT / 2,
            toX: nodeX + gWidth,
            toY: motherY + CARD_HEIGHT / 2,
            color: "rgba(236, 72, 153, 0.12)",
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
      } else {
        const fX = centerX - 130;
        const fY = centerY - 150;
        placeholders.push({ type: "father", targetPersonId: focusPerson.id, x: fX, y: fY });
        links.push({ fromX: fX + CARD_WIDTH / 2, fromY: fY + CARD_HEIGHT, toX: centerX + CARD_WIDTH / 3, toY: centerY, color: "rgba(59, 130, 246, 0.12)" });
      }
      
      if (focusPerson.motherId) {
        const mother = people.find(p => p.id === focusPerson.motherId);
        if (mother) {
          const mX = centerX + 130;
          const mY = centerY - 150;
          nodes.push({ person: mother, x: mX, y: mY, generation: -1 });
          links.push({ fromX: mX + CARD_WIDTH / 2, fromY: mY + CARD_HEIGHT, toX: centerX + (CARD_WIDTH * 2) / 3, toY: centerY, color: "rgba(236, 72, 153, 0.4)" });
        }
      } else {
        const mX = centerX + 130;
        const mY = centerY - 150;
        placeholders.push({ type: "mother", targetPersonId: focusPerson.id, x: mX, y: mY });
        links.push({ fromX: mX + CARD_WIDTH / 2, fromY: mY + CARD_HEIGHT, toX: centerX + (CARD_WIDTH * 2) / 3, toY: centerY, color: "rgba(236, 72, 153, 0.12)" });
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
      
      // Toujours ajouter un placeholder conjoint à côté du dernier conjoint (ou du focus)
      const spX = centerX + 260 * (myUnions.length + 1);
      placeholders.push({ type: "spouse", targetPersonId: focusPerson.id, x: spX, y: centerY });
      links.push({
        fromX: centerX + CARD_WIDTH,
        fromY: centerY + CARD_HEIGHT / 2,
        toX: spX,
        toY: centerY + CARD_HEIGHT / 2,
        color: "rgba(212, 175, 55, 0.15)"
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
              const isAnyDragging = !!draggedPersonId;
              const isCurrentDragged = draggedPersonId === person.id;
              const isOver = dragOverTarget?.type === "person" && dragOverTarget?.id === person.id;
              
              // Déterminer les couleurs de bordure/sexe et d'interaction
              const borderStyle = isOver ? "2px dashed var(--accent-emerald)" :
                                  isFocused ? "2px solid var(--accent-gold)" :
                                  person.gender === "M" ? "2px solid rgba(59, 130, 246, 0.3)" : 
                                  person.gender === "F" ? "2px solid rgba(236, 72, 153, 0.3)" : 
                                  "2px solid rgba(156, 163, 175, 0.3)";
                                  
              const genderTagColor = person.gender === "M" ? "rgba(59, 130, 246, 0.12)" : 
                                     person.gender === "F" ? "rgba(236, 72, 153, 0.12)" : 
                                     "rgba(156, 163, 175, 0.12)";

              const shadowStyle = isOver ? "0 0 20px rgba(16, 185, 129, 0.6)" :
                                  isFocused ? "0 0 15px var(--accent-gold-glow)" : 
                                  "0 4px 12px rgba(0,0,0,0.2)";

              const opacityStyle = isCurrentDragged ? 0.4 : isAnyDragging ? 0.85 : 1;
              const transformStyle = isOver ? "scale(1.03)" : "scale(1)";

              return (
                <g key={person.id} transform={`translate(${x}, ${y})`}>
                  {/* foreignObject permet d'intégrer du HTML/CSS moderne dans un arbre SVG */}
                  <foreignObject 
                    width={CARD_WIDTH} 
                    height={CARD_HEIGHT}
                  >
                    <div 
                      className={`card glass`}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData("text/plain", person.id);
                        setDraggedPersonId(person.id);
                      }}
                      onDragEnd={(e) => {
                        e.stopPropagation();
                        setDraggedPersonId("");
                        setDragOverTarget(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedPersonId && draggedPersonId !== person.id) {
                          setDragOverTarget({ id: person.id, type: "person" });
                        }
                      }}
                      onDragLeave={() => {
                        setDragOverTarget(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceId = e.dataTransfer.getData("text/plain") || draggedPersonId;
                        if (sourceId && sourceId !== person.id) {
                          handleDropOnPerson(sourceId, person.id);
                        }
                        setDragOverTarget(null);
                      }}
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
                        cursor: "grab",
                        boxShadow: shadowStyle,
                        opacity: opacityStyle,
                        transform: transformStyle,
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
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

            {/* Rendu des placeholders virtuels interactifs */}
            {placeholders.map((ph, idx) => {
              const isOver = dragOverTarget?.type === "placeholder" && 
                             dragOverTarget?.id === `${ph.type}-${ph.targetPersonId}`;
              
              const label = ph.type === "father" ? "+ Ajouter un Père" : 
                            ph.type === "mother" ? "+ Ajouter une Mère" : 
                            "+ Ajouter un Conjoint";
              
              const genderColor = ph.type === "father" ? "rgba(59, 130, 246, 0.05)" :
                                  ph.type === "mother" ? "rgba(236, 72, 153, 0.05)" :
                                  "rgba(212, 175, 55, 0.05)";
                                  
              const activeBorder = isOver ? "2px dashed var(--accent-emerald)" : "2px dashed rgba(255, 255, 255, 0.2)";
              const activeBg = isOver ? "rgba(16, 185, 129, 0.12)" : genderColor;
              const activeShadow = isOver ? "0 0 15px rgba(16, 185, 129, 0.4)" : "none";
              const scaleStyle = isOver ? "scale(1.03)" : "scale(1)";

              return (
                <g key={`ph-${idx}`} transform={`translate(${ph.x}, ${ph.y})`}>
                  <foreignObject width={CARD_WIDTH} height={CARD_HEIGHT}>
                    <div
                      className="card glass"
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedPersonId) {
                          setDragOverTarget({
                            id: `${ph.type}-${ph.targetPersonId}`,
                            type: "placeholder",
                            placeholderType: ph.type,
                            targetPersonId: ph.targetPersonId
                          });
                        }
                      }}
                      onDragLeave={() => setDragOverTarget(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceId = e.dataTransfer.getData("text/plain") || draggedPersonId;
                        if (sourceId) {
                          linkPeople(sourceId, ph.targetPersonId, ph.type);
                        }
                        setDragOverTarget(null);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetPerson = people.find(p => p.id === ph.targetPersonId);
                        setQuickCreateConfig({
                          type: ph.type,
                          initialGender: ph.type === "father" ? "M" : ph.type === "mother" ? "F" : "U",
                          initialLastName: ph.type === "father" && targetPerson ? targetPerson.lastName : "",
                          placeholderType: ph.type,
                          targetPersonId: ph.targetPersonId
                        });
                        setQuickCreateModalOpen(true);
                      }}
                      style={{
                        padding: "0.5rem 0.75rem",
                        height: "100%",
                        width: "100%",
                        border: activeBorder,
                        borderRadius: "10px",
                        background: activeBg,
                        boxShadow: activeShadow,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                        transform: scaleStyle,
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    >
                      <span style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>
                        {ph.type === "father" ? "👨‍" : ph.type === "mother" ? "👩" : "💍"}
                      </span>
                      <strong
                        className="title-font"
                        style={{
                          fontSize: "0.75rem",
                          color: isOver ? "var(--accent-emerald)" : "var(--text-secondary)",
                          fontWeight: 600
                        }}
                      >
                        {label}
                      </strong>
                      <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                        {isOver ? "Déposer pour lier" : "Glisser un profil ou cliquer"}
                      </span>
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
        💡 <strong>Clic :</strong> Sélectionner • <strong>Double-clic :</strong> Ouvrir Profil • <strong>Molette :</strong> Zoomer • <strong>Glisser :</strong> Relier ou déplacer
      </div>

      {/* 4. BOUTON FLOTTANT DE CRÉATION RAPIDE D'INDIVIDU ISOLE */}
      <button
        onClick={() => {
          setQuickCreateConfig({
            type: "child",
            initialGender: "U",
            initialLastName: "",
          });
          setQuickCreateModalOpen(true);
        }}
        className="btn btn-accent shadow-lg"
        style={{
          position: "absolute",
          bottom: "1rem",
          left: "1rem",
          zIndex: 10,
          borderRadius: "50px",
          padding: "0.75rem 1.25rem",
          fontSize: "0.85rem",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          boxShadow: "0 10px 25px rgba(0,0,0,0.4)"
        }}
      >
        ✨ Nouvel Individu
      </button>

      {/* 5. DRAG SIDEBAR - INDIVIDUS EN ATTENTE */}
      <div 
        className="glass"
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          bottom: "4rem",
          width: "280px",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          borderRadius: "12px",
          border: "1px solid var(--border-subtle)",
          background: "rgba(18, 18, 18, 0.75)",
          backdropFilter: "blur(16px)",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.4)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isSidebarOpen ? "translateX(0)" : "translateX(calc(100% + 2rem))",
          opacity: isSidebarOpen ? 1 : 0,
          pointerEvents: isSidebarOpen ? "all" : "none"
        }}
      >
        {/* Header de la sidebar */}
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="title-font" style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-gold)", display: "flex", alignItems: "center", gap: "0.4rem", margin: 0 }}>
            <span>⏳</span> Sans lien ({unlinkedPeople.length})
          </h3>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            style={{ 
              background: "transparent", 
              border: "none", 
              color: "var(--text-muted)", 
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            ✕
          </button>
        </div>

        {/* Liste des personnes non reliées */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {unlinkedPeople.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
              <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>🎉</span>
              Tous les individus sont reliés à l'arbre !
            </div>
          ) : (
            unlinkedPeople.map(p => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData("text/plain", p.id);
                  setDraggedPersonId(p.id);
                }}
                onDragEnd={(e) => {
                  e.stopPropagation();
                  setDraggedPersonId("");
                  setDragOverTarget(null);
                }}
                className="card animate-fade-in"
                style={{
                  padding: "0.6rem",
                  background: p.gender === "M" ? "rgba(59, 130, 246, 0.08)" : p.gender === "F" ? "rgba(236, 72, 153, 0.08)" : "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  cursor: "grab",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "transform 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>
                  {p.gender === "M" ? "👨‍" : p.gender === "F" ? "👩" : "👤"}
                </span>
                <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {p.firstName} {p.lastName.toUpperCase()}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                    {p.birthDate ? `° ${p.birthDate.substring(0,4)}` : "Date inconnue"}
                  </span>
                </div>
                <button
                  onClick={() => setFocusId(p.id)}
                  style={{
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.7rem",
                    borderRadius: "4px",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text-secondary)",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  title="Centrer l'arbre sur cette personne"
                >
                  🎯
                </button>
              </div>
            ))
          )}
        </div>
        
        {/* Footer de la sidebar avec bouton d'ajout */}
        <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => {
              setQuickCreateConfig({
                type: "child",
                initialGender: "U",
                initialLastName: "",
              });
              setQuickCreateModalOpen(true);
            }}
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.5rem", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}
          >
            ➕ Créer un individu isolé
          </button>
        </div>
      </div>

      {/* BOUTON FLOTTANT D'OUVERTURE SIDEBAR */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="glass btn-hover"
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            zIndex: 10,
            padding: "0.6rem 1rem",
            borderRadius: "8px",
            border: "1px solid var(--border-subtle)",
            background: "rgba(18, 18, 18, 0.75)",
            backdropFilter: "blur(12px)",
            color: "var(--accent-gold)",
            fontSize: "0.8rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          ⏳ Sans lien ({unlinkedPeople.length})
        </button>
      )}

      {/* 6. MODALE CHOIX DE RELATION AU DROP */}
      {relationChoiceModalOpen && relationChoiceConfig && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(8px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setRelationChoiceModalOpen(false)}
        >
          <div 
            className="card glass animate-fade-in"
            style={{
              width: "420px",
              padding: "2rem",
              borderRadius: "16px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-secondary)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "2.5rem" }}>🔗</span>
              <h3 className="title-font" style={{ fontSize: "1.3rem", color: "var(--accent-gold)", marginTop: "0.5rem", margin: 0 }}>
                Créer une relation
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                Quelle relation unit <strong>{people.find(p => p.id === relationChoiceConfig.sourcePersonId)?.firstName}</strong> et <strong>{people.find(p => p.id === relationChoiceConfig.targetPersonId)?.firstName}</strong> ?
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {relationChoiceConfig.availableOptions.includes("father") && (
                <button
                  onClick={() => {
                    linkPeople(relationChoiceConfig.sourcePersonId, relationChoiceConfig.targetPersonId, "father");
                    setRelationChoiceModalOpen(false);
                  }}
                  className="btn btn-secondary"
                  style={{ width: "100%", padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span>👨‍👦 Définir comme <strong>Père</strong></span>
                  <span>➡️</span>
                </button>
              )}
              {relationChoiceConfig.availableOptions.includes("mother") && (
                <button
                  onClick={() => {
                    linkPeople(relationChoiceConfig.sourcePersonId, relationChoiceConfig.targetPersonId, "mother");
                    setRelationChoiceModalOpen(false);
                  }}
                  className="btn btn-secondary"
                  style={{ width: "100%", padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span>👩‍👦 Définir comme <strong>Mère</strong></span>
                  <span>➡️</span>
                </button>
              )}
              {relationChoiceConfig.availableOptions.includes("spouse") && (
                <button
                  onClick={() => {
                    linkPeople(relationChoiceConfig.sourcePersonId, relationChoiceConfig.targetPersonId, "spouse");
                    setRelationChoiceModalOpen(false);
                  }}
                  className="btn btn-secondary"
                  style={{ width: "100%", padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span>💍 Définir comme <strong>Conjoint</strong></span>
                  <span>➡️</span>
                </button>
              )}
              {relationChoiceConfig.availableOptions.includes("child") && (
                <button
                  onClick={() => {
                    linkPeople(relationChoiceConfig.sourcePersonId, relationChoiceConfig.targetPersonId, "child");
                    setRelationChoiceModalOpen(false);
                  }}
                  className="btn btn-secondary"
                  style={{ width: "100%", padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span>👶 Définir comme <strong>Enfant</strong></span>
                  <span>➡️</span>
                </button>
              )}
              {relationChoiceConfig.availableOptions.length === 0 && (
                <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  Aucune relation directe possible (toutes les places de parents sont déjà prises ou incompatibles).
                </p>
              )}
            </div>

            <button 
              onClick={() => setRelationChoiceModalOpen(false)}
              className="btn btn-primary"
              style={{ width: "100%", background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* 7. MODALE CRÉATION RAPIDE D'INDIVIDU CONTEXTUEL */}
      {quickCreateModalOpen && (
        <QuickCreatePersonModal
          isOpen={quickCreateModalOpen}
          onClose={() => setQuickCreateModalOpen(false)}
          onSuccess={handleQuickCreateSuccess}
          initialGender={quickCreateConfig.initialGender}
          initialLastName={quickCreateConfig.initialLastName}
          title={
            quickCreateConfig.type === "father" ? "Ajouter le Père" :
            quickCreateConfig.type === "mother" ? "Ajouter la Mère" :
            quickCreateConfig.type === "spouse" ? "Ajouter le Conjoint" :
            "Ajouter un Nouvel Individu"
          }
        />
      )}

    </div>
  );
}
