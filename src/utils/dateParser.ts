export interface ParsedDate {
  year: number | null;
  month: number | null; // 1-12
  day: number | null;
  isApproximate: boolean;
  isBefore: boolean;
  isAfter: boolean;
  formatted: string;
}

const MONTH_MAP: Record<string, number> = {
  // French
  janvier: 1, janv: 1, jan: 1,
  février: 2, févr: 2, fév: 2,
  mars: 3, mar: 3,
  avril: 4, avr: 4,
  mai: 5,
  juin: 6,
  juillet: 7, juil: 7,
  août: 8, aoû: 8, aout: 8,
  septembre: 9, sept: 9, sep: 9,
  octobre: 10, oct: 10,
  novembre: 11, nov: 11,
  décembre: 12, déc: 12, decembre: 12, dec: 12,

  // English
  january: 1,
  february: 2, feb: 2,
  march: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
};

export function parseDate(dateStr: string | null | undefined): ParsedDate {
  const result: ParsedDate = {
    year: null,
    month: null,
    day: null,
    isApproximate: false,
    isBefore: false,
    isAfter: false,
    formatted: ""
  };

  if (!dateStr) return result;
  
  const original = dateStr.trim();
  result.formatted = original;
  
  let cleaned = original.toLowerCase();

  // 1. Detect precision prefixes
  const approxRegex = /\b(vers|environ|env\.?|ca\.?|circa|v\.?|about|abt\.?|approx\.?)\b/;
  const beforeRegex = /\b(avant|av\.?|before|bef\.?)\b/;
  const afterRegex = /\b(après|ap\.?|after|aft\.?)\b/;

  if (approxRegex.test(cleaned)) {
    result.isApproximate = true;
    cleaned = cleaned.replace(approxRegex, "").trim();
  }
  if (beforeRegex.test(cleaned)) {
    result.isBefore = true;
    cleaned = cleaned.replace(beforeRegex, "").trim();
  }
  if (afterRegex.test(cleaned)) {
    result.isAfter = true;
    cleaned = cleaned.replace(afterRegex, "").trim();
  }

  // Remove day suffixes like "er", "st", "nd", "rd", "th"
  cleaned = cleaned.replace(/\b(\d{1,2})(?:er|st|nd|rd|th)\b/g, "$1");

  // Remove small joining words like "le", "in", "on", "the", "en", "de"
  cleaned = cleaned.replace(/\b(le|la|en|in|on|the|de|of)\b/g, "").replace(/\s+/g, " ").trim();

  // 2. Try parsing numeric formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD MM YYYY
  const numericDateRegex = /^(\d{1,2})[\/\-\.\s]+(\d{1,2})[\/\-\.\s]+(\d{3,4})$/;
  const numericMatch = cleaned.match(numericDateRegex);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10);
    const year = parseInt(numericMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year > 0) {
      result.day = day;
      result.month = month;
      result.year = year;
      return result;
    }
  }

  // 3. Try parsing text formats: DD Month YYYY (e.g. "20 mai 1920" or "July 12 1789")
  // Let's match a pattern with words: word could be day, word could be month, number could be year
  // Pattern 1: Day (1 or 2 digits) MonthName (letters, optional dots) Year (3 or 4 digits)
  const dayMonthYearRegex = /^(\d{1,2})\s+([a-zéûô\.]+)\s+(\d{3,4})$/;
  const dmyMatch = cleaned.match(dayMonthYearRegex);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const monthName = dmyMatch[2].replace(/\.$/, ""); // remove trailing dot
    const year = parseInt(dmyMatch[3], 10);
    const month = MONTH_MAP[monthName];
    if (day >= 1 && day <= 31 && month && year > 0) {
      result.day = day;
      result.month = month;
      result.year = year;
      return result;
    }
  }

  // Pattern 2: MonthName (letters, optional dots) Day (1 or 2 digits) Year (3 or 4 digits) (English style, e.g. "July 12 1789" or "July 12, 1789")
  const monthDayYearRegex = /^([a-zéûô\.]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*|\s+)(\d{3,4})$/;
  const mdyMatch = cleaned.match(monthDayYearRegex);
  if (mdyMatch) {
    const monthName = mdyMatch[1].replace(/\.$/, "");
    const day = parseInt(mdyMatch[2], 10);
    const year = parseInt(mdyMatch[3], 10);
    const month = MONTH_MAP[monthName];
    if (day >= 1 && day <= 31 && month && year > 0) {
      result.day = day;
      result.month = month;
      result.year = year;
      return result;
    }
  }

  // Pattern 3: MonthName (letters) Year (3 or 4 digits) (e.g. "juin 1850")
  const monthYearRegex = /^([a-zéûô\.]+)\s+(\d{3,4})$/;
  const myMatch = cleaned.match(monthYearRegex);
  if (myMatch) {
    const monthName = myMatch[1].replace(/\.$/, "");
    const year = parseInt(myMatch[2], 10);
    const month = MONTH_MAP[monthName];
    if (month && year > 0) {
      result.month = month;
      result.year = year;
      return result;
    }
  }

  // Pattern 4: Year (3 or 4 digits) (e.g. "1750")
  const yearOnlyRegex = /^(\d{3,4})$/;
  const yMatch = cleaned.match(yearOnlyRegex);
  if (yMatch) {
    result.year = parseInt(yMatch[1], 10);
    return result;
  }

  // Fallback: search for any 3 or 4 digit number in the cleaned text as the year
  const anyYearMatch = cleaned.match(/\b(\d{3,4})\b/);
  if (anyYearMatch) {
    result.year = parseInt(anyYearMatch[1], 10);
    
    // Also try to find any month name in the string
    for (const [key, value] of Object.entries(MONTH_MAP)) {
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const monthRegex = new RegExp(`\\b${escapedKey}\\b`);
      if (monthRegex.test(cleaned)) {
        result.month = value;
        break;
      }
    }
  }

  return result;
}

// Compare two parsed dates for sorting (returns -1 if a < b, 1 if a > b, 0 if equal/unknown)
export function compareDates(aStr: string | null | undefined, bStr: string | null | undefined): number {
  const a = parseDate(aStr);
  const b = parseDate(bStr);

  if (a.year === null && b.year === null) return 0;
  if (a.year === null) return 1; // place unknown dates at the end
  if (b.year === null) return -1;

  if (a.year !== b.year) {
    return a.year - b.year;
  }

  if (a.month === null && b.month === null) return 0;
  if (a.month === null) return -1; // assume earlier in the year if month unknown
  if (b.month === null) return 1;

  if (a.month !== b.month) {
    return a.month - b.month;
  }

  if (a.day === null && b.day === null) return 0;
  if (a.day === null) return -1; // assume earlier in the month if day unknown
  if (b.day === null) return 1;

  return a.day - b.day;
}
