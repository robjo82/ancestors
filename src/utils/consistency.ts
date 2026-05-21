import { parseDate, compareDates } from "./dateParser";

export interface PersonForConsistency {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string | null;
  deathDate: string | null;
  fatherId: string | null;
  motherId: string | null;
  father?: { id: string; firstName: string; lastName: string; gender?: string; birthDate: string | null; deathDate: string | null } | null;
  mother?: { id: string; firstName: string; lastName: string; gender?: string; birthDate: string | null; deathDate: string | null } | null;
}

export interface UnionForConsistency {
  id: string;
  weddingDate: string | null;
  partnerId: string;
  partnerName: string;
}

export interface ChildForConsistency {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
}

export interface ChronologyWarning {
  type: string;
  message: string;
  severity: "warning" | "error";
}

// Convert a parsed date to a Date object if full date is available
function toDate(year: number, month: number | null, day: number | null): Date | null {
  if (year === null) return null;
  const m = month ? month - 1 : 0; // JS months are 0-11
  const d = day ? day : 1;
  return new Date(year, m, d);
}

export function checkPersonConsistency(
  person: PersonForConsistency,
  unions: UnionForConsistency[] = [],
  children: ChildForConsistency[] = []
): ChronologyWarning[] {
  const warnings: ChronologyWarning[] = [];

  const parsedBirth = parseDate(person.birthDate);
  const parsedDeath = parseDate(person.deathDate);

  // 1. Birth vs Death
  if (person.birthDate && person.deathDate) {
    if (compareDates(person.birthDate, person.deathDate) > 0) {
      warnings.push({
        type: "DEATH_BEFORE_BIRTH",
        message: `La date de décès (${person.deathDate}) est antérieure à la date de naissance (${person.birthDate}).`,
        severity: "error"
      });
    }
  }

  // 1b. Longevity checks
  if (parsedBirth.year) {
    const currentYear = new Date().getFullYear();
    if (person.deathDate && parsedDeath.year) {
      const longevity = parsedDeath.year - parsedBirth.year;
      if (longevity > 150) {
        warnings.push({
          type: "LONGEVITY_ERROR",
          message: `L'individu a vécu plus de 150 ans (${longevity} ans).`,
          severity: "error"
        });
      } else if (longevity > 120) {
        warnings.push({
          type: "LONGEVITY_WARNING",
          message: `L'individu a vécu plus de 120 ans (${longevity} ans).`,
          severity: "warning"
        });
      }
    } else {
      // Still alive (no death date registered)
      const longevity = currentYear - parsedBirth.year;
      if (longevity > 150) {
        warnings.push({
          type: "ALIVE_LONGEVITY_ERROR",
          message: `L'individu est toujours marqué vivant mais aurait plus de 150 ans (${longevity} ans) aujourd'hui.`,
          severity: "error"
        });
      } else if (longevity > 120) {
        warnings.push({
          type: "ALIVE_LONGEVITY_WARNING",
          message: `L'individu est toujours marqué vivant mais aurait plus de 120 ans (${longevity} ans) aujourd'hui.`,
          severity: "warning"
        });
      }
    }
  }

  // 1c. Gender inconsistencies
  if (person.father && person.father.gender === "F") {
    warnings.push({
      type: "FATHER_GENDER_INVALID",
      message: `Le père (${person.father.firstName} ${person.father.lastName}) est enregistré avec un genre féminin.`,
      severity: "error"
    });
  }
  if (person.mother && person.mother.gender === "M") {
    warnings.push({
      type: "MOTHER_GENDER_INVALID",
      message: `La mère (${person.mother.firstName} ${person.mother.lastName}) est enregistrée avec un genre masculin.`,
      severity: "error"
    });
  }

  // 2. Father age at birth
  if (person.father && person.birthDate && person.father.birthDate) {
    const parsedFatherBirth = parseDate(person.father.birthDate);
    if (parsedBirth.year && parsedFatherBirth.year) {
      const fatherAge = parsedBirth.year - parsedFatherBirth.year;
      if (compareDates(person.father.birthDate, person.birthDate) > 0) {
        warnings.push({
          type: "CHILD_BORN_BEFORE_PARENT",
          message: `L'individu est né avant son père (${person.father.firstName} ${person.father.lastName}).`,
          severity: "error"
        });
      } else if (fatherAge < 10) {
        warnings.push({
          type: "PARENT_TOO_YOUNG_AT_BIRTH",
          message: `Le père (${person.father.firstName} ${person.father.lastName}) avait moins de 10 ans (${fatherAge} ans) à la naissance de cet individu.`,
          severity: "error"
        });
      } else if (fatherAge < 13) {
        warnings.push({
          type: "PARENT_TOO_YOUNG_AT_BIRTH",
          message: `Le père (${person.father.firstName} ${person.father.lastName}) avait moins de 13 ans (${fatherAge} ans) à la naissance de cet individu.`,
          severity: "warning"
        });
      } else if (fatherAge > 80) {
        warnings.push({
          type: "PARENT_TOO_OLD_AT_BIRTH",
          message: `Le père (${person.father.firstName} ${person.father.lastName}) avait plus de 80 ans (${fatherAge} ans) à la naissance de cet individu.`,
          severity: "warning"
        });
      }
    }
  }

  // 3. Mother age at birth
  if (person.mother && person.birthDate && person.mother.birthDate) {
    const parsedMotherBirth = parseDate(person.mother.birthDate);
    if (parsedBirth.year && parsedMotherBirth.year) {
      const motherAge = parsedBirth.year - parsedMotherBirth.year;
      if (compareDates(person.mother.birthDate, person.birthDate) > 0) {
        warnings.push({
          type: "CHILD_BORN_BEFORE_PARENT",
          message: `L'individu est né avant sa mère (${person.mother.firstName} ${person.mother.lastName}).`,
          severity: "error"
        });
      } else if (motherAge < 10) {
        warnings.push({
          type: "PARENT_TOO_YOUNG_AT_BIRTH",
          message: `La mère (${person.mother.firstName} ${person.mother.lastName}) avait moins de 10 ans (${motherAge} ans) à la naissance de cet individu.`,
          severity: "error"
        });
      } else if (motherAge < 13) {
        warnings.push({
          type: "PARENT_TOO_YOUNG_AT_BIRTH",
          message: `La mère (${person.mother.firstName} ${person.mother.lastName}) avait moins de 13 ans (${motherAge} ans) à la naissance de cet individu.`,
          severity: "warning"
        });
      } else if (motherAge > 60) {
        warnings.push({
          type: "PARENT_TOO_OLD_AT_BIRTH",
          message: `La mère (${person.mother.firstName} ${person.mother.lastName}) avait plus de 60 ans (${motherAge} ans) à la naissance de cet individu.`,
          severity: "warning"
        });
      }
    }
  }

  // 4. Unions (Marriage vs Birth/Death)
  unions.forEach(u => {
    if (u.weddingDate) {
      if (person.birthDate && compareDates(person.birthDate, u.weddingDate) > 0) {
        warnings.push({
          type: "WEDDING_BEFORE_BIRTH",
          message: `Le mariage avec ${u.partnerName} (${u.weddingDate}) a eu lieu avant la naissance de l'individu (${person.birthDate}).`,
          severity: "error"
        });
      }
      if (person.deathDate && compareDates(u.weddingDate, person.deathDate) > 0) {
        warnings.push({
          type: "WEDDING_AFTER_DEATH",
          message: `Le mariage avec ${u.partnerName} (${u.weddingDate}) a eu lieu après le décès de l'individu (${person.deathDate}).`,
          severity: "error"
        });
      }

      const parsedWedding = parseDate(u.weddingDate);
      if (parsedBirth.year && parsedWedding.year) {
        const ageAtWedding = parsedWedding.year - parsedBirth.year;
        if (ageAtWedding < 12) {
          warnings.push({
            type: "MARRIAGE_TOO_YOUNG",
            message: `L'individu avait moins de 12 ans (${ageAtWedding} ans) lors de son mariage avec ${u.partnerName}.`,
            severity: "warning"
          });
        }
      }
    }
  });

  // 5. Parent's death vs child's birth (Posthumous child or birth after mother's death)
  if (person.birthDate) {
    if (person.father && person.father.deathDate) {
      const parsedFatherDeath = parseDate(person.father.deathDate);
      if (compareDates(person.father.deathDate, person.birthDate) < 0) {
        // Child born after father's death. Check if it's > 300 days (approx. 10 months)
        if (parsedBirth.year && parsedFatherDeath.year) {
          const dateBirth = toDate(parsedBirth.year, parsedBirth.month, parsedBirth.day);
          const dateFatherDeath = toDate(parsedFatherDeath.year, parsedFatherDeath.month, parsedFatherDeath.day);
          
          if (dateBirth && dateFatherDeath) {
            const diffTime = dateBirth.getTime() - dateFatherDeath.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 300) {
              warnings.push({
                type: "CHILD_BORN_LONG_AFTER_FATHER_DEATH",
                message: `Cet enfant est né plus de 9 mois (${diffDays} jours) après le décès de son père (${person.father.firstName} ${person.father.lastName}).`,
                severity: "warning"
              });
            }
          } else {
            // Fallback to year difference if full dates are not available
            const diffYears = parsedBirth.year - parsedFatherDeath.year;
            if (diffYears > 1) {
              warnings.push({
                type: "CHILD_BORN_LONG_AFTER_FATHER_DEATH",
                message: `Cet enfant est né plus de 9 mois après le décès de son père (${person.father.firstName} ${person.father.lastName}).`,
                severity: "warning"
              });
            }
          }
        }
      }
    }

    if (person.mother && person.mother.deathDate) {
      if (compareDates(person.mother.deathDate, person.birthDate) < 0) {
        warnings.push({
          type: "CHILD_BORN_AFTER_MOTHER_DEATH",
          message: `Cet enfant est né après le décès de sa mère (${person.mother.firstName} ${person.mother.lastName}).`,
          severity: "error"
        });
      }
    }
  }

  // 6. Checks on children relative to this person
  if (person.birthDate && children && children.length > 0) {
    children.forEach(c => {
      if (c.birthDate) {
        const parsedChildBirth = parseDate(c.birthDate);
        if (parsedBirth.year && parsedChildBirth.year) {
          const parentAgeAtChildBirth = parsedChildBirth.year - parsedBirth.year;
          if (compareDates(c.birthDate, person.birthDate) < 0) {
            warnings.push({
              type: "CHILD_BORN_BEFORE_PARENT",
              message: `L'enfant (${c.firstName} ${c.lastName}) est né avant cet individu.`,
              severity: "error"
            });
          } else if (parentAgeAtChildBirth < 10) {
            warnings.push({
              type: "CHILD_PARENT_TOO_YOUNG",
              message: `Cet individu avait moins de 10 ans (${parentAgeAtChildBirth} ans) à la naissance de son enfant (${c.firstName} ${c.lastName}).`,
              severity: "error"
            });
          } else if (parentAgeAtChildBirth < 13) {
            warnings.push({
              type: "CHILD_PARENT_TOO_YOUNG",
              message: `Cet individu avait moins de 13 ans (${parentAgeAtChildBirth} ans) à la naissance de son enfant (${c.firstName} ${c.lastName}).`,
              severity: "warning"
            });
          } else {
            // Check too old for parent
            if (person.gender === "M" && parentAgeAtChildBirth > 80) {
              warnings.push({
                type: "CHILD_PARENT_TOO_OLD",
                message: `Cet individu avait plus de 80 ans (${parentAgeAtChildBirth} ans) à la naissance de son enfant (${c.firstName} ${c.lastName}).`,
                severity: "warning"
              });
            } else if (person.gender === "F" && parentAgeAtChildBirth > 60) {
              warnings.push({
                type: "CHILD_PARENT_TOO_OLD",
                message: `Cet individu avait plus de 60 ans (${parentAgeAtChildBirth} ans) à la naissance de son enfant (${c.firstName} ${c.lastName}).`,
                severity: "warning"
              });
            }
          }
        }
      }
    });
  }

  return warnings;
}
