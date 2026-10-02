/**
 * Seed ONLY three unpublished World Domination stubs.
 * Title + date only — no fabricated narrative, claims, or people.
 * Never publishes. Never invents case content.
 */
import "dotenv/config";
import { getCasesPrisma } from "@/lib/cases-db";

const STUBS = [
  {
    slug: "assassination-of-rafic-hariri-2005",
    title: "Assassination of Rafic Hariri",
    eventDateText: "14 February 2005",
    eventDate: new Date("2005-02-14T00:00:00.000Z"),
    location: "Beirut",
  },
  {
    slug: "september-11-attacks-2001",
    title: "September 11 attacks",
    eventDateText: "11 September 2001",
    eventDate: new Date("2001-09-11T00:00:00.000Z"),
    location: null,
  },
  {
    slug: "assassination-of-john-f-kennedy-1963",
    title: "Assassination of John F. Kennedy",
    eventDateText: "22 November 1963",
    eventDate: new Date("1963-11-22T00:00:00.000Z"),
    location: null,
  },
] as const;

async function main() {
  const db = getCasesPrisma();

  for (const stub of STUBS) {
    await db.caseFile.upsert({
      where: { slug: stub.slug },
      create: {
        slug: stub.slug,
        title: stub.title,
        summary: "",
        eventDateText: stub.eventDateText,
        eventDate: stub.eventDate,
        location: stub.location,
        status: "draft",
        worldDomination: true,
        labels: ["world_domination"],
        contentWarning: true,
        preferOfficialSources: true,
        legalStatusNote:
          "Stub only — unpublished. Prefer official/court/government sources when researching.",
      },
      update: {
        title: stub.title,
        eventDateText: stub.eventDateText,
        eventDate: stub.eventDate,
        location: stub.location,
        // Never auto-publish on seed.
        worldDomination: true,
        labels: ["world_domination"],
      },
    });
  }

  const wdCount = await db.caseFile.count({
    where: { worldDomination: true },
  });
  if (wdCount > 3) {
    throw new Error(
      `World Domination invariant broken: ${wdCount} flagged (max 3).`,
    );
  }

  console.log(
    `Seeded ${STUBS.length} unpublished World Domination stubs (wd flagged=${wdCount}).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await getCasesPrisma().$disconnect();
  });
