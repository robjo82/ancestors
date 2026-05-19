import { compareDates } from "./dateParser";

export interface PersonMinimal {
  id: string;
  fatherId: string | null;
  motherId: string | null;
  birthDate: string | null;
}

// 1. Sosa-Stradonitz Numbering (Ancestors)
// Given a list of people and a root person ID (de cujus), calculate Sosa numbers.
// Returns a map of personId -> number[] (an array because one person can have multiple Sosa numbers in case of implexes).
export function computeSosaNumbering(
  people: PersonMinimal[],
  rootPersonId: string
): Record<string, number[]> {
  const sosaMap: Record<string, number[]> = {};
  
  // Quick lookup map for performance
  const peopleMap = new Map<string, PersonMinimal>();
  people.forEach(p => peopleMap.set(p.id, p));

  if (!peopleMap.has(rootPersonId)) return sosaMap;

  // Queue for BFS traversal: { personId, sosaNumber }
  const queue: { id: string; sosa: number }[] = [{ id: rootPersonId, sosa: 1 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { id, sosa } = queue.shift()!;
    
    // Add Sosa number to this person's array
    if (!sosaMap[id]) {
      sosaMap[id] = [];
    }
    if (!sosaMap[id].includes(sosa)) {
      sosaMap[id].push(sosa);
    }

    const person = peopleMap.get(id);
    if (!person) continue;

    // Use a safety check for maximum sosa number to prevent infinite recursion
    if (sosa > 1048576) continue; 

    // Enqueue father (sosa * 2)
    if (person.fatherId) {
      queue.push({ id: person.fatherId, sosa: sosa * 2 });
    }
    // Enqueue mother (sosa * 2 + 1)
    if (person.motherId) {
      queue.push({ id: person.motherId, sosa: sosa * 2 + 1 });
    }
  }

  // Sort Sosa numbers in ascending order for each person
  for (const id in sosaMap) {
    sosaMap[id].sort((a, b) => a - b);
  }

  return sosaMap;
}

// Helper to construct sorted child maps
function buildSortedChildMap(people: PersonMinimal[]): Map<string, PersonMinimal[]> {
  const childMap = new Map<string, PersonMinimal[]>();
  
  people.forEach(p => {
    if (p.fatherId) {
      if (!childMap.has(p.fatherId)) childMap.set(p.fatherId, []);
      childMap.get(p.fatherId)!.push(p);
    }
    if (p.motherId) {
      if (!childMap.has(p.motherId)) childMap.set(p.motherId, []);
      childMap.get(p.motherId)!.push(p);
    }
  });

  // Sort children of each parent chronologically
  for (const [parentId, children] of childMap.entries()) {
    children.sort((a, b) => compareDates(a.birthDate, b.birthDate));
  }

  return childMap;
}

// 2. Aboville Numbering (Descendants)
// Given a list of people and a root ancestor ID, calculate Aboville numbers (e.g. 1, 1.1, 1.1.1, 1.2).
export function computeAbovilleNumbering(
  people: PersonMinimal[],
  rootPersonId: string
): Record<string, string> {
  const abovilleMap: Record<string, string> = {};
  const childMap = buildSortedChildMap(people);
  const visited = new Set<string>();

  function traverse(personId: string, currentNumber: string) {
    if (visited.has(personId)) return; // Prevent cycle loops
    visited.add(personId);

    abovilleMap[personId] = currentNumber;

    const children = childMap.get(personId) || [];
    children.forEach((child, index) => {
      traverse(child.id, `${currentNumber}.${index + 1}`);
    });
  }

  traverse(rootPersonId, "1");
  return abovilleMap;
}

// 3. Pélissier Numbering (Descendants)
// Given a list of people and a root ancestor ID, calculate Pélissier numbers alternating letters and numbers.
// Generation 1 (children of root) gets Uppercase letters (A, B, C...)
// Generation 2 (grandchildren) gets Numbers (1, 2, 3...)
// Generation 3 (great-grandchildren) gets Lowercase letters (a, b, c...)
// Generation 4 (great-great-grandchildren) gets Numbers...
export function computePelissierNumbering(
  people: PersonMinimal[],
  rootPersonId: string
): Record<string, string> {
  const pelissierMap: Record<string, string> = {};
  const childMap = buildSortedChildMap(people);
  const visited = new Set<string>();

  // Helper to generate a letter token from an index (e.g., 0 -> A, 25 -> Z, 26 -> AA)
  function getLetterToken(index: number, uppercase: boolean): string {
    const baseCharCode = uppercase ? 65 : 97;
    const letter = String.fromCharCode(baseCharCode + (index % 26));
    if (index >= 26) {
      return letter + Math.floor(index / 26);
    }
    return letter;
  }

  function traverse(personId: string, currentNumber: string, generationLevel: number) {
    if (visited.has(personId)) return;
    visited.add(personId);

    pelissierMap[personId] = currentNumber;

    const children = childMap.get(personId) || [];
    children.forEach((child, index) => {
      let childToken = "";
      
      if (generationLevel % 2 === 0) {
        // Generation Level 0 -> Generation Level 1 (children of root)
        // L = 1 -> Uppercase letter
        if (generationLevel === 0) {
          childToken = getLetterToken(index, true);
        } else {
          // L = 3, 5, 7... -> Lowercase letter
          childToken = getLetterToken(index, false);
        }
      } else {
        // Generation Level 1 -> Generation Level 2, 3 -> 4, etc.
        // L = 2, 4, 6... -> Number
        childToken = (index + 1).toString();
      }

      traverse(child.id, `${currentNumber}${childToken}`, generationLevel + 1);
    });
  }

  traverse(rootPersonId, "1", 0);
  return pelissierMap;
}
