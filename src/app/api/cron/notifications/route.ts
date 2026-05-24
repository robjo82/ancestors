import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { lookupNameDay } from "@/lib/nameDays";

// Robust birthday parser that extracts month (1-12) and day (1-31)
function parseBirthDate(birthStr: string | null): { month: number; day: number } | null {
  if (!birthStr) return null;
  const cleaned = birthStr.trim().toLowerCase();
  if (!cleaned) return null;

  // 1. Check YYYY-MM-DD
  const ymdMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    return { month: parseInt(ymdMatch[2], 10), day: parseInt(ymdMatch[3], 10) };
  }

  // 2. Check DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (dmyMatch) {
    return { month: parseInt(dmyMatch[2], 10), day: parseInt(dmyMatch[1], 10) };
  }

  // 3. Check text months in French / English (e.g., "19 mai 1985", "May 19, 1985")
  const monthsFr = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "aoû", "sep", "oct", "nov", "déc"];
  const monthsEn = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  // Find a day (1 or 2 digits)
  const dayMatch = cleaned.match(/\b(\d{1,2})\b/);
  if (!dayMatch) return null;
  const day = parseInt(dayMatch[1], 10);

  // Look for month index
  let month = -1;
  for (let i = 0; i < 12; i++) {
    if (cleaned.includes(monthsFr[i]) || cleaned.includes(monthsEn[i])) {
      month = i + 1;
      break;
    }
  }

  if (month !== -1 && day >= 1 && day <= 31) {
    return { month, day };
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const executeSimulated = searchParams.get("simulate") === "true";

    // 1. Fetch all users who want either birthday or name day notifications
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { emailAnniversaries: true },
          { emailNameDays: true }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailAnniversaries: true,
        emailNameDays: true,
        trees: {
          select: {
            id: true,
            name: true,
            userPersonId: true,
            people: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                birthDate: true,
                deathDate: true
              }
            }
          }
        }
      }
    });

    const report: any[] = [];
    const today = new Date();
    
    // Target date for birthday is exactly 7 days from now
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 7);
    const targetMonth = targetDate.getMonth() + 1;
    const targetDay = targetDate.getDate();

    // Today's month and day for Name Days
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const todaySaints = lookupNameDay(currentMonth, currentDay);

    for (const user of users) {
      const userReport: any = {
        userEmail: user.email,
        userName: user.name || user.email,
        anniversariesSent: [],
        nameDaysSent: []
      };

      for (const tree of user.trees) {
        // Only process living individuals (deathDate is absent/empty)
        const livingPeople = tree.people.filter(p => !p.deathDate || !p.deathDate.trim());

        // A. Birthdays Check (Exactly in 7 days / 1 week)
        if (user.emailAnniversaries) {
          for (const person of livingPeople) {
            const parsed = parseBirthDate(person.birthDate);
            if (parsed && parsed.month === targetMonth && parsed.day === targetDay) {
              userReport.anniversariesSent.push({
                treeName: tree.name,
                personId: person.id,
                name: `${person.firstName} ${person.lastName}`,
                birthDate: person.birthDate,
                targetAnniversaryDate: targetDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
              });
            }
          }
        }

        // B. Name Days Check (Gregorian Calendar Today)
        if (user.emailNameDays && todaySaints.length > 0) {
          for (const person of livingPeople) {
            const fName = person.firstName.toLowerCase();
            // Check if their first name contains or matches any of today's saint names
            const matchedSaint = todaySaints.find(saint => {
              const cleanedSaint = saint.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              const cleanedFName = fName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              return cleanedFName === cleanedSaint || cleanedFName.split(/[\s\-]/).includes(cleanedSaint);
            });

            if (matchedSaint) {
              userReport.nameDaysSent.push({
                treeName: tree.name,
                personId: person.id,
                name: `${person.firstName} ${person.lastName}`,
                saintCelebrated: matchedSaint,
                date: today.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
              });
            }
          }
        }
      }

      if (userReport.anniversariesSent.length > 0 || userReport.nameDaysSent.length > 0) {
        report.push(userReport);

        // Simulation or real dispatch logging
        if (executeSimulated) {
          console.log(`[SIMULATION EMAIL DISPATCHED] to ${user.email} :`);
          if (userReport.anniversariesSent.length > 0) {
            console.log(` -> Anniversaires dans une semaine :`, userReport.anniversariesSent);
          }
          if (userReport.nameDaysSent.length > 0) {
            console.log(` -> Fêtes célébrées aujourd'hui :`, userReport.nameDaysSent);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Analyse des notifications terminée avec succès.",
      timestamp: today.toISOString(),
      todaySaints,
      targetAnniversaryDate: targetDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }),
      simulation: executeSimulated,
      dispatchedNotifications: report
    });
  } catch (e: any) {
    console.error("Cron notifications error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors du calcul des notifications." }, { status: 500 });
  }
}
