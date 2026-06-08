"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import QuickCreatePersonModal from "../components/QuickCreatePersonModal";
import { parseDate } from "../../utils/dateParser";

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
  fromPersonId?: string;
  toPersonId?: string;
}

export default function InteractiveTreeClient({ people, unions }: InteractiveTreeClientProps) {
  const router = useRouter();
  
  // États de l'arbre
  const [focusId, setFocusId] = useState<string>("");
  const [layoutMode, setLayoutMode] = useState<"pedigree" | "descendants" | "relative">("relative");
  const [maxGenerations, setMaxGenerations] = useState<number>(4);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearchList, setShowSearchList] = useState<boolean>(false);
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(true);
  
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

  // Adapter les volets à l'écran mobile à l'initialisation
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsControlsOpen(false);
      setIsSidebarOpen(false);
    }
  }, []);

  // Recadrer l'arbre automatiquement à chaque changement majeur de structure ou de layout
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToScreen();
    }, 100);
    return () => clearTimeout(timer);
  }, [focusId, layoutMode, people.length, unions.length]);

  // Recentrer et ajuster l'arbre à l'écran (Fit to screen)
  const fitToScreen = () => {
    if (!containerRef.current || nodes.length === 0) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
      if (node.x < minX) minX = node.x;
      if (node.x + CARD_WIDTH > maxX) maxX = node.x + CARD_WIDTH;
      if (node.y < minY) minY = node.y;
      if (node.y + CARD_HEIGHT > maxY) maxY = node.y + CARD_HEIGHT;
    });

    placeholders.forEach(ph => {
      if (ph.x < minX) minX = ph.x;
      if (ph.x + CARD_WIDTH > maxX) maxX = ph.x + CARD_WIDTH;
      if (ph.y < minY) minY = ph.y;
      if (ph.y + CARD_HEIGHT > maxY) maxY = ph.y + CARD_HEIGHT;
    });

    if (minX === Infinity) return;

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    const padding = 50; // Marge de respiration en pixels
    const scaleX = (containerWidth - 2 * padding) / treeWidth;
    const scaleY = (containerHeight - 2 * padding) / treeHeight;

    // Zoom calculé, contraint entre 0.3 et 1.1 pour un rendu premium
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.1);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const newPanX = containerWidth / 2 - centerX * newZoom;
    const newPanY = containerHeight / 2 - centerY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const getYearOnly = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    const parsed = parseDate(dateStr);
    return parsed.year ? String(parsed.year) : "";
  };

  const getRelationshipTag = (nodePerson: PersonNode): string => {
    if (nodePerson.id === focusId) return "🟢 Sujet";
    
    // Check if parent
    const fPerson = people.find(p => p.id === focusId);
    if (fPerson) {
      if (nodePerson.id === fPerson.fatherId) return "👨‍ PÈRE";
      if (nodePerson.id === fPerson.motherId) return "👩‍ MÈRE";
      
      // Check if child
      if (nodePerson.fatherId === focusId || nodePerson.motherId === focusId) return "👶 ENFANT";
      
      // Check if sibling
      const sharesFather = fPerson.fatherId && nodePerson.fatherId === fPerson.fatherId;
      const sharesMother = fPerson.motherId && nodePerson.motherId === fPerson.motherId;
      if (sharesFather && sharesMother) {
        return nodePerson.gender === "M" ? "👦 FRÈRE" : nodePerson.gender === "F" ? "👧 SŒUR" : "👤 FRATRIE";
      } else if (sharesFather || sharesMother) {
        return nodePerson.gender === "M" ? "👦 DEMI-FRÈRE" : nodePerson.gender === "F" ? "👧 DEMI-SŒUR" : "👤 DEMI-FRATRIE";
      }
    }
    
    // Check if spouse
    const myUnions = unions.filter(u => u.partner1Id === focusId || u.partner2Id === focusId);
    if (myUnions.some(u => u.partner1Id === nodePerson.id || u.partner2Id === nodePerson.id)) {
      return "💍 CONJOINT";
    }
    
    return "";
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

  // Calcul des distances d'indirectivité par rapport au focusId (BFS)
  const getIndirectDistances = (): Record<string, number> => {
    const distances: Record<string, number> = {};
    if (!focusId || people.length === 0) return distances;

    // A. Trouver tous les ancêtres directs
    const directAncestors = new Set<string>();
    const findAncestors = (id: string) => {
      if (!id || directAncestors.has(id)) return;
      directAncestors.add(id);
      const person = people.find(p => p.id === id);
      if (person) {
        if (person.fatherId) findAncestors(person.fatherId);
        if (person.motherId) findAncestors(person.motherId);
      }
    };
    findAncestors(focusId);

    // B. Trouver tous les descendants directs
    const directDescendants = new Set<string>();
    const findDescendants = (id: string) => {
      if (!id || directDescendants.has(id)) return;
      directDescendants.add(id);
      const children = people.filter(p => p.fatherId === id || p.motherId === id);
      children.forEach(c => findDescendants(c.id));
    };
    findDescendants(focusId);

    // C. La lignée directe est l'union des ancêtres et descendants
    const directLine = new Set<string>([...directAncestors, ...directDescendants]);

    // Initialiser les distances de la lignée directe à 0
    directLine.forEach(id => {
      distances[id] = 0;
    });

    // D. BFS pour propager la distance aux lignes indirectes
    const queue: string[] = Array.from(directLine);
    const adj: Record<string, Set<string>> = {};
    
    people.forEach(p => {
      if (!adj[p.id]) adj[p.id] = new Set();
      if (p.fatherId) {
        adj[p.id].add(p.fatherId);
        if (!adj[p.fatherId]) adj[p.fatherId] = new Set();
        adj[p.fatherId].add(p.id);
      }
      if (p.motherId) {
        adj[p.id].add(p.motherId);
        if (!adj[p.motherId]) adj[p.motherId] = new Set();
        adj[p.motherId].add(p.id);
      }
    });

    unions.forEach(u => {
      if (u.partner1Id && u.partner2Id) {
        if (!adj[u.partner1Id]) adj[u.partner1Id] = new Set();
        adj[u.partner1Id].add(u.partner2Id);
        if (!adj[u.partner2Id]) adj[u.partner2Id] = new Set();
        adj[u.partner2Id].add(u.partner1Id);
      }
    });

    while (queue.length > 0) {
      const u = queue.shift()!;
      const currentDist = distances[u];
      const neighbors = adj[u];
      if (neighbors) {
        neighbors.forEach(v => {
          if (distances[v] === undefined) {
            distances[v] = currentDist + 1;
            queue.push(v);
          }
        });
      }
    }

    people.forEach(p => {
      if (distances[p.id] === undefined) {
        distances[p.id] = 999;
      }
    });

    return distances;
  };

  const distances = getIndirectDistances();

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
            fromPersonId: person.id,
            toPersonId: person.fatherId,
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
            fromPersonId: person.id,
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
            fromPersonId: person.id,
            toPersonId: person.motherId,
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
            fromPersonId: person.id,
          });
        }
      };
      
      const leafGap = 110; // Écart vertical minimal entre deux cartes à la dernière génération
      const totalSpan = leafGap * Math.pow(2, Math.max(0, maxGenerations - 2));
      buildPedigree(focusPerson.id, 0, 300, totalSpan);
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
            fromPersonId: person.id,
            toPersonId: child.id,
          });
        });
      };
      
      buildDescendants(focusPerson.id, 0, 400, 800);
    } 
    // ------------------------------------------
    // 3. LAYOUT : VUE RELATIVE INFINIE (VUE FAMILLE)
    // ------------------------------------------
    else {
      // Centre de la vue
      const centerX = 350;
      const centerY = 250;
      const gHeight = 185; // Distance verticale entre générations
      const xSpacing = 260; // Distance horizontale entre cartes
      
      // Parcours en largeur (BFS) non orienté pour attribuer une génération à chaque personne connectée
      const relativeGen = new Map<string, number>();
      relativeGen.set(focusPerson.id, 0);
      const queue: string[] = [focusPerson.id];
      const visited = new Set<string>();
      
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        
        const currentGen = relativeGen.get(currentId)!;
        const currentPerson = people.find(p => p.id === currentId);
        if (!currentPerson) continue;
        
        // A. Parents: gen = currentGen - 1
        if (currentPerson.fatherId) {
          if (!relativeGen.has(currentPerson.fatherId)) {
            relativeGen.set(currentPerson.fatherId, currentGen - 1);
            queue.push(currentPerson.fatherId);
          }
        }
        if (currentPerson.motherId) {
          if (!relativeGen.has(currentPerson.motherId)) {
            relativeGen.set(currentPerson.motherId, currentGen - 1);
            queue.push(currentPerson.motherId);
          }
        }
        
        // B. Enfants: gen = currentGen + 1
        const children = people.filter(p => p.fatherId === currentId || p.motherId === currentId);
        children.forEach(child => {
          if (!relativeGen.has(child.id)) {
            relativeGen.set(child.id, currentGen + 1);
            queue.push(child.id);
          }
        });
        
        // C. Conjoints: gen = currentGen
        const partnerUnions = unions.filter(u => u.partner1Id === currentId || u.partner2Id === currentId);
        partnerUnions.forEach(u => {
          const spouseId = u.partner1Id === currentId ? u.partner2Id : u.partner1Id;
          if (!relativeGen.has(spouseId)) {
            relativeGen.set(spouseId, currentGen);
            queue.push(spouseId);
          }
        });
        
        // D. Fratrie: gen = currentGen
        const siblings = people.filter(p => 
          p.id !== currentId && 
          ((currentPerson.fatherId && p.fatherId === currentPerson.fatherId) || 
           (currentPerson.motherId && p.motherId === currentPerson.motherId))
        );
        siblings.forEach(sib => {
          if (!relativeGen.has(sib.id)) {
            relativeGen.set(sib.id, currentGen);
            queue.push(sib.id);
          }
        });
      }
      
      // Grouper les personnes par génération
      const peopleByGen: { [gen: number]: string[] } = {};
      relativeGen.forEach((gen, personId) => {
        if (!peopleByGen[gen]) {
          peopleByGen[gen] = [];
        }
        peopleByGen[gen].push(personId);
      });
      
      // Trier chaque rangée pour optimiser l'affichage
      const orderedPeopleAtGen: { [gen: number]: string[] } = {};
      Object.keys(peopleByGen).forEach(genStr => {
        const gen = parseInt(genStr);
        const list = peopleByGen[gen];
        
        if (gen === 0) {
          // Tri spécial pour la génération 0 (sujet principal au centre, conjoints à droite, fratrie à gauche)
          const myUnions = unions.filter(u => u.partner1Id === focusPerson.id || u.partner2Id === focusPerson.id);
          const spouses = myUnions.map(u => u.partner1Id === focusPerson.id ? u.partner2Id : u.partner1Id)
                                  .filter(id => list.includes(id));
          const siblings = people.filter(p => 
            p.id !== focusPerson.id && 
            ((focusPerson.fatherId && p.fatherId === focusPerson.fatherId) || 
             (focusPerson.motherId && p.motherId === focusPerson.motherId))
          ).map(p => p.id).filter(id => list.includes(id));
          
          const coreSet = new Set([focusPerson.id, ...spouses, ...siblings]);
          const others = list.filter(id => !coreSet.has(id));
          
          orderedPeopleAtGen[gen] = [...siblings, focusPerson.id, ...spouses, ...others];
        } else {
          // Pour les autres générations, l'ordre de découverte BFS est déjà excellent
          orderedPeopleAtGen[gen] = list;
        }
      });
      
      // Map de stockage des coordonnées calculées
      const personCoords = new Map<string, { x: number; y: number }>();
      
      // Calcul des coordonnées de tous les nœuds
      Object.keys(orderedPeopleAtGen).forEach(genStr => {
        const gen = parseInt(genStr);
        const list = orderedPeopleAtGen[gen];
        const N = list.length;
        
        list.forEach((personId, i) => {
          const person = people.find(p => p.id === personId);
          if (!person) return;
          
          const x = centerX + (i - (N - 1) / 2) * xSpacing;
          const y = centerY + gen * gHeight;
          
          nodes.push({ person, x, y, generation: gen });
          personCoords.set(personId, { x, y });
        });
      });
      
      // Coordonnées du sujet focalisé pour le positionnement des placeholders
      const focusCoords = personCoords.get(focusPerson.id) || { x: centerX, y: centerY };
      const focusX = focusCoords.x;
      const focusY = focusCoords.y;
      
      // Positionner les placeholders interactifs autour du focusPerson uniquement
      // A. Père fantôme
      if (!focusPerson.fatherId) {
        const fX = focusX - 130;
        const fY = focusY - 160;
        placeholders.push({ type: "father", targetPersonId: focusPerson.id, x: fX, y: fY });
        links.push({ 
          fromX: fX + CARD_WIDTH / 2, 
          fromY: fY + CARD_HEIGHT, 
          toX: focusX + CARD_WIDTH / 3, 
          toY: focusY, 
          color: "rgba(59, 130, 246, 0.12)",
          fromPersonId: focusPerson.id,
        });
      }
      
      // B. Mère fantôme
      if (!focusPerson.motherId) {
        const mX = focusX + 130;
        const mY = focusY - 160;
        placeholders.push({ type: "mother", targetPersonId: focusPerson.id, x: mX, y: mY });
        links.push({ 
          fromX: mX + CARD_WIDTH / 2, 
          fromY: mY + CARD_HEIGHT, 
          toX: focusX + (CARD_WIDTH * 2) / 3, 
          toY: focusY, 
          color: "rgba(236, 72, 153, 0.12)",
          fromPersonId: focusPerson.id,
        });
      }
      
      // C. Conjoint fantôme
      const myUnions = unions.filter(u => u.partner1Id === focusPerson.id || u.partner2Id === focusPerson.id);
      const lastSpouseX = focusX + myUnions.length * xSpacing;
      const spX = lastSpouseX + xSpacing;
      placeholders.push({ type: "spouse", targetPersonId: focusPerson.id, x: spX, y: focusY });
      links.push({
        fromX: focusX + CARD_WIDTH,
        fromY: focusY + CARD_HEIGHT / 2,
        toX: spX,
        toY: focusY + CARD_HEIGHT / 2,
        color: "rgba(212, 175, 55, 0.15)",
        fromPersonId: focusPerson.id,
      });
      
      // Générer les liaisons parent-enfant
      nodes.forEach(({ person, x, y }) => {
        if (person.fatherId) {
          const fatherCoords = personCoords.get(person.fatherId);
          if (fatherCoords) {
            links.push({
              fromX: fatherCoords.x + CARD_WIDTH / 2,
              fromY: fatherCoords.y + CARD_HEIGHT,
              toX: x + CARD_WIDTH / 2,
              toY: y,
              color: person.gender === "M" ? "rgba(59, 130, 246, 0.3)" : "rgba(236, 72, 153, 0.3)",
              fromPersonId: person.fatherId,
              toPersonId: person.id,
            });
          }
        }
        if (person.motherId) {
          const motherCoords = personCoords.get(person.motherId);
          if (motherCoords) {
            links.push({
              fromX: motherCoords.x + CARD_WIDTH / 2,
              fromY: motherCoords.y + CARD_HEIGHT,
              toX: x + CARD_WIDTH / 2,
              toY: y,
              color: person.gender === "M" ? "rgba(59, 130, 246, 0.3)" : "rgba(236, 72, 153, 0.3)",
              fromPersonId: person.motherId,
              toPersonId: person.id,
            });
          }
        }
      });
      
      // Générer les liaisons de mariage
      unions.forEach(u => {
        const coords1 = personCoords.get(u.partner1Id);
        const coords2 = personCoords.get(u.partner2Id);
        if (coords1 && coords2) {
          const leftCoords = coords1.x < coords2.x ? coords1 : coords2;
          const rightCoords = coords1.x < coords2.x ? coords2 : coords1;
          const leftId = coords1.x < coords2.x ? u.partner1Id : u.partner2Id;
          const rightId = coords1.x < coords2.x ? u.partner2Id : u.partner1Id;
          
          links.push({
            fromX: leftCoords.x + CARD_WIDTH,
            fromY: leftCoords.y + CARD_HEIGHT / 2,
            toX: rightCoords.x,
            toY: rightCoords.y + CARD_HEIGHT / 2,
            color: "var(--accent-gold)",
            fromPersonId: leftId,
            toPersonId: rightId,
          });
        }
      });
      
      // Générer les liaisons de fratrie directes très discrètes pour la génération 0
      orderedPeopleAtGen[0]?.forEach(personId => {
        if (personId !== focusPerson.id) {
          const sibling = people.find(p => p.id === personId);
          if (sibling && 
              ((focusPerson.fatherId && sibling.fatherId === focusPerson.fatherId) || 
               (focusPerson.motherId && sibling.motherId === focusPerson.motherId))) {
            const siblingCoords = personCoords.get(sibling.id);
            if (siblingCoords) {
              links.push({
                fromX: siblingCoords.x + (siblingCoords.x < focusX ? CARD_WIDTH : 0),
                fromY: siblingCoords.y + CARD_HEIGHT / 2,
                toX: focusX + (siblingCoords.x < focusX ? 0 : CARD_WIDTH),
                toY: focusY + CARD_HEIGHT / 2,
                color: "rgba(255, 255, 255, 0.08)",
                fromPersonId: sibling.id,
                toPersonId: focusPerson.id,
              });
            }
          }
        }
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
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomIntensity = 0.08;
    const scrollDirection = e.deltaY < 0 ? 1 : -1;

    const nextZoom = Math.min(Math.max(zoom * (1 + scrollDirection * zoomIntensity), 0.15), 3);

    // Zoom centré sur la position de la souris
    const ratio = nextZoom / zoom;
    const nextPanX = mouseX - (mouseX - pan.x) * ratio;
    const nextPanY = mouseY - (mouseY - pan.y) * ratio;

    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
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
      {isControlsOpen ? (
        <div 
          className="glass tree-controls-panel" 
          style={{ 
            position: "absolute", 
            top: "1rem", 
            left: "1rem", 
            zIndex: 10, 
            padding: "1rem", 
            width: "300px", 
            display: "flex", 
            flexDirection: "column", 
            gap: "1rem",
            maxHeight: "calc(100% - 2rem)",
            overflowY: "auto",
            background: "rgba(18, 18, 18, 0.75)",
            backdropFilter: "blur(16px)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
          }}
        >
          {/* Header du panneau */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-gold)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              🌿 Configuration
            </span>
            <button 
              onClick={() => setIsControlsOpen(false)}
              style={{ 
                background: "transparent", 
                border: "none", 
                color: "var(--text-muted)", 
                cursor: "pointer",
                fontSize: "0.85rem"
              }}
            >
              ✕
            </button>
          </div>

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
                max="10" 
                value={maxGenerations} 
                onChange={(e) => setMaxGenerations(parseInt(e.target.value))}
                style={{ accentColor: "var(--accent-emerald)", cursor: "pointer", width: "100%" }}
              />
            </div>
          )}

          {/* Caméra boutons rapides */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={fitToScreen} className="btn btn-secondary" style={{ flex: 1, padding: "0.4rem", fontSize: "0.75rem" }}>
              🎯 Ajuster l'écran
            </button>
            <button 
              onClick={() => {
                if (!containerRef.current) return;
                const nextZoom = Math.min(zoom + 0.15, 3);
                const rect = containerRef.current.getBoundingClientRect();
                setPan(p => ({
                  x: rect.width / 2 - (rect.width / 2 - p.x) * (nextZoom / zoom),
                  y: rect.height / 2 - (rect.height / 2 - p.y) * (nextZoom / zoom)
                }));
                setZoom(nextZoom);
              }} 
              className="btn btn-secondary" 
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
            >
              ➕
            </button>
            <button 
              onClick={() => {
                if (!containerRef.current) return;
                const nextZoom = Math.max(zoom - 0.15, 0.15);
                const rect = containerRef.current.getBoundingClientRect();
                setPan(p => ({
                  x: rect.width / 2 - (rect.width / 2 - p.x) * (nextZoom / zoom),
                  y: rect.height / 2 - (rect.height / 2 - p.y) * (nextZoom / zoom)
                }));
                setZoom(nextZoom);
              }} 
              className="btn btn-secondary" 
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
            >
              ➖
            </button>
          </div>

          {/* Légende de Lignée (Colorimétrie progressive) */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem", marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ⚖️ Intensité de la Lignée
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3.5px", background: "linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(236, 72, 153, 0.35))", border: "1.5px solid rgba(255,255,255,0.4)" }}></span>
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>Lignée Directe</span>
                <span style={{ color: "var(--text-muted)", marginLeft: "auto", fontSize: "0.65rem" }}>Asc. / Desc. directs</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3.5px", background: "rgba(156, 163, 175, 0.08)", border: "1.5px solid rgba(156, 163, 175, 0.3)" }}></span>
                <span style={{ color: "var(--text-secondary)" }}>1er degré indirect</span>
                <span style={{ color: "var(--text-muted)", marginLeft: "auto", fontSize: "0.65rem" }}>Frères, Conjoints</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3.5px", background: "rgba(148, 163, 184, 0.04)", border: "1px dashed rgba(148, 163, 184, 0.25)" }}></span>
                <span style={{ color: "var(--text-muted)" }}>2e degré indirect</span>
                <span style={{ color: "var(--text-muted)", marginLeft: "auto", fontSize: "0.65rem" }}>Oncles, Neveux</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3.5px", background: "rgba(148, 163, 184, 0.02)", border: "1px dotted rgba(148, 163, 184, 0.15)", opacity: 0.55 }}></span>
                <span style={{ color: "var(--text-muted)", opacity: 0.7 }}>Branches distantes</span>
                <span style={{ color: "var(--text-muted)", marginLeft: "auto", fontSize: "0.65rem", opacity: 0.7 }}>Cousins éloignés</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* BOUTON FLOTTANT D'OUVERTURE DES CONTROLES SI FERMÉ */
        <button
          onClick={() => setIsControlsOpen(true)}
          className="glass btn-hover"
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
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
          ⚙️ <span>Contrôles</span>
        </button>
      )}

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
            {links.map((link, idx) => {
              // Custom line styles based on distances
              const dFrom = link.fromPersonId ? distances[link.fromPersonId] : undefined;
              const dTo = link.toPersonId ? distances[link.toPersonId] : undefined;
              
              // We take the max distance to determine how indirect this link is.
              let dist = 0;
              if (dFrom !== undefined && dTo !== undefined) {
                dist = Math.max(dFrom, dTo);
              } else if (dFrom !== undefined) {
                dist = dFrom;
              } else if (dTo !== undefined) {
                dist = dTo;
              }

              let strokeColor = link.color || "rgba(255, 255, 255, 0.18)";
              let strokeWidth = "2.5";
              let strokeDasharray = undefined;

              if (dist === 0) {
                strokeColor = link.color || "rgba(255, 255, 255, 0.25)";
                strokeWidth = "2.5";
              } else if (dist === 1) {
                if (link.color === "var(--accent-gold)") {
                  strokeColor = "rgba(212, 175, 55, 0.6)";
                } else if (link.color) {
                  strokeColor = link.color.includes("rgba") ? link.color.replace(/0\.\d+\)/, "0.22)") : link.color;
                } else {
                  strokeColor = "rgba(255, 255, 255, 0.14)";
                }
                strokeWidth = "1.8";
              } else if (dist === 2) {
                if (link.color === "var(--accent-gold)") {
                  strokeColor = "rgba(212, 175, 55, 0.3)";
                } else {
                  strokeColor = "rgba(148, 163, 184, 0.2)";
                }
                strokeWidth = "1.2";
                strokeDasharray = "4,4";
              } else {
                if (link.color === "var(--accent-gold)") {
                  strokeColor = "rgba(212, 175, 55, 0.15)";
                } else {
                  strokeColor = "rgba(148, 163, 184, 0.1)";
                }
                strokeWidth = "1";
                strokeDasharray = "2,4";
              }

              // Générer un chemin courbe de Bézier élégant en fonction du layout
              const getLinkPath = () => {
                const { fromX, fromY, toX, toY, color } = link;
                
                // Union/mariage : ligne horizontale droite
                if (color === "var(--accent-gold)" || color === "rgba(212, 175, 55, 0.6)" || color?.includes("212, 175, 55")) {
                  return `M ${fromX} ${fromY} L ${toX} ${toY}`;
                }
                
                if (layoutMode === "pedigree") {
                  // S-curve horizontale
                  const midX = (fromX + toX) / 2;
                  return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
                } else if (layoutMode === "descendants") {
                  // S-curve verticale
                  const midY = (fromY + toY) / 2;
                  return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
                } else {
                  // Vue relative : courbe verticale ou horizontale selon l'orientation
                  const dx = Math.abs(fromX - toX);
                  const dy = Math.abs(fromY - toY);
                  if (dy > dx) {
                    const midY = (fromY + toY) / 2;
                    return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
                  } else {
                    const midX = (fromX + toX) / 2;
                    return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
                  }
                }
              };

              return (
                <g key={`l-${idx}`}>
                  {/* Courbe de Bézier élégante fluide */}
                  <path 
                    d={getLinkPath()}
                    fill="none" 
                    stroke={strokeColor} 
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                    style={{ transition: "all 0.2s" }}
                  />
                </g>
              );
            })}

            {/* Rendu des nœuds (Personnes) */}
            {nodes.map(({ person, x, y }) => {
              const isFocused = person.id === focusId;
              const isAnyDragging = !!draggedPersonId;
              const isCurrentDragged = draggedPersonId === person.id;
              const isOver = dragOverTarget?.type === "person" && dragOverTarget?.id === person.id;
              const relationTag = getRelationshipTag(person);
              const dist = distances[person.id] ?? 0;
              
              // Déterminer les couleurs de bordure/sexe et d'interaction
              let baseBorderColor = person.gender === "M" ? "rgba(59, 130, 246, 0.45)" : 
                                    person.gender === "F" ? "rgba(236, 72, 153, 0.45)" : 
                                    "rgba(156, 163, 175, 0.45)";
              let borderType = "solid";
              let borderWidth = "2px";

              if (dist === 1) {
                baseBorderColor = person.gender === "M" ? "rgba(59, 130, 246, 0.3)" : 
                                  person.gender === "F" ? "rgba(236, 72, 153, 0.3)" : 
                                  "rgba(156, 163, 175, 0.3)";
                borderWidth = "1.5px";
              } else if (dist === 2) {
                baseBorderColor = "rgba(148, 163, 184, 0.25)";
                borderWidth = "1px";
                borderType = "dashed";
              } else if (dist >= 3) {
                baseBorderColor = "rgba(148, 163, 184, 0.15)";
                borderWidth = "1px";
                borderType = "dotted";
              }

              const borderStyle = isOver ? "2px dashed var(--accent-emerald)" :
                                  isFocused ? "2.5px solid var(--accent-gold)" :
                                  `${borderWidth} ${borderType} ${baseBorderColor}`;
                                  
              // Background glass color with gender tints and distance fading
              let genderTagColor = "rgba(255, 255, 255, 0.03)";
              if (dist === 0) {
                genderTagColor = isFocused ? "rgba(212, 175, 55, 0.16)" :
                                 person.gender === "M" ? "rgba(59, 130, 246, 0.14)" : 
                                 person.gender === "F" ? "rgba(236, 72, 153, 0.14)" : 
                                 "rgba(156, 163, 175, 0.12)";
              } else if (dist === 1) {
                genderTagColor = isFocused ? "rgba(212, 175, 55, 0.12)" :
                                 person.gender === "M" ? "rgba(59, 130, 246, 0.08)" : 
                                 person.gender === "F" ? "rgba(236, 72, 153, 0.08)" : 
                                 "rgba(156, 163, 175, 0.07)";
              } else if (dist === 2) {
                genderTagColor = "rgba(148, 163, 184, 0.04)";
              } else {
                genderTagColor = "rgba(148, 163, 184, 0.02)";
              }

              const shadowStyle = isOver ? "0 0 20px rgba(16, 185, 129, 0.6)" :
                                  isFocused ? "0 0 20px var(--accent-gold-glow)" : 
                                  dist === 0 ? "0 6px 16px rgba(0,0,0,0.3)" :
                                  dist === 1 ? "0 4px 10px rgba(0,0,0,0.2)" :
                                  "0 2px 6px rgba(0,0,0,0.1)";

              let baseOpacity = 1;
              if (dist === 1) baseOpacity = 0.85;
              else if (dist === 2) baseOpacity = 0.7;
              else if (dist >= 3) baseOpacity = 0.55;

              const opacityStyle = isCurrentDragged ? 0.4 : isAnyDragging ? 0.85 : baseOpacity;
              const transformStyle = isOver ? "scale(1.03)" : "scale(1)";

              let filterStyle = "none";
              if (dist === 2) {
                filterStyle = "grayscale(20%)";
              } else if (dist >= 3) {
                filterStyle = "grayscale(60%) contrast(90%)";
              }

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
                        filter: filterStyle,
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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", overflow: "hidden", flex: 1 }}>
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
                                fontSize: "0.82rem", 
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
                                fontSize: "0.82rem", 
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
                        {relationTag && (
                          <span style={{ 
                            fontSize: "0.58rem", 
                            padding: "0.15rem 0.35rem", 
                            borderRadius: "4px", 
                            background: isFocused ? "rgba(212, 175, 55, 0.22)" : "rgba(255, 255, 255, 0.08)",
                            color: isFocused ? "var(--accent-gold)" : "var(--text-secondary)",
                            border: isFocused ? "1px solid rgba(212, 175, 55, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            marginLeft: "0.25rem"
                          }}>
                            {relationTag}
                          </span>
                        )}
                      </div>

                      {/* Corps (Métier & dates) */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: "0.75rem" }}>
                        <span style={{ color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "90px" }}>
                          {person.occupation || "—"}
                        </span>
                        <strong style={{ color: "var(--text-secondary)" }}>
                          {getYearOnly(person.birthDate) || "????"} - {getYearOnly(person.deathDate)}
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

        {/* Barre de navigation flottante premium sur le canvas */}
        <div 
          className="glass animate-fade-in" 
          style={{ 
            position: "absolute", 
            bottom: "1.5rem", 
            left: "50%", 
            transform: "translateX(-50%)", 
            zIndex: 10, 
            padding: "0.5rem 1rem", 
            display: "flex", 
            alignItems: "center", 
            gap: "0.75rem",
            background: "rgba(18, 18, 18, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            borderRadius: "50px"
          }}
        >
          <button 
            onClick={fitToScreen} 
            style={{ background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem", padding: "0.25rem 0.5rem", display: "flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}
            title="Ajuster l'arbre à l'écran"
          >
            🎯 <span style={{ fontSize: "0.75rem" }}>Ajuster</span>
          </button>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          <button 
            onClick={() => {
              if (!containerRef.current) return;
              const nextZoom = Math.max(zoom - 0.15, 0.15);
              const rect = containerRef.current.getBoundingClientRect();
              setPan(p => ({
                x: rect.width / 2 - (rect.width / 2 - p.x) * (nextZoom / zoom),
                y: rect.height / 2 - (rect.height / 2 - p.y) * (nextZoom / zoom)
              }));
              setZoom(nextZoom);
            }} 
            style={{ background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
            title="Zoom arrière"
          >
            ➖
          </button>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", minWidth: "40px", textAlign: "center", fontWeight: 600 }}>
            {Math.round(zoom * 100)}%
          </span>
          <button 
            onClick={() => {
              if (!containerRef.current) return;
              const nextZoom = Math.min(zoom + 0.15, 3.0);
              const rect = containerRef.current.getBoundingClientRect();
              setPan(p => ({
                x: rect.width / 2 - (rect.width / 2 - p.x) * (nextZoom / zoom),
                y: rect.height / 2 - (rect.height / 2 - p.y) * (nextZoom / zoom)
              }));
              setZoom(nextZoom);
            }} 
            style={{ background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
            title="Zoom avant"
          >
            ➕
          </button>
        </div>
      </div>

      {/* 3. AIDE CONTEXTUELLE FLOTTANTE */}
      <div 
        className="glass help-text-floating" 
        style={{ 
          position: "absolute", 
          bottom: "1rem", 
          right: "1rem", 
          padding: "0.5rem 1rem", 
          fontSize: "0.85rem", 
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
        className="btn btn-accent shadow-lg quick-create-floating"
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
