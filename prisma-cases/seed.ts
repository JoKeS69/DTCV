/**
 * Seed ONLY three unpublished World Domination stubs + Investigation Mode samples.
 * WD stubs: title + date only — no fabricated narrative, claims, or people.
 * Investigation samples: original fictional whodunits (never sync to public /cases).
 */
import "dotenv/config";
import { getCasesPrisma } from "@/lib/cases-db";
import { SAMPLE_INVESTIGATION_CASES } from "@/lib/investigation/sample-cases";
import { draftToCreateData } from "@/lib/investigation/serialize";
import { validateInvestigationCase } from "@/lib/investigation/validate";

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
        // Never auto-publish on seed. Do not touch status/publishedAt —
        // admin research → approve → publish is the only publish path.
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

  let invCount = 0;
  for (const sample of SAMPLE_INVESTIGATION_CASES) {
    const v = validateInvestigationCase(sample);
    if (!v.ok) {
      throw new Error(
        `Sample ${sample.slug} failed validation: ${v.issues
          .map((i) => i.message)
          .join("; ")}`,
      );
    }
    await db.investigationCase.upsert({
      where: { slug: sample.slug },
      create: draftToCreateData(sample, "published", "seed"),
      update: {
        title: sample.title,
        teaser: sample.teaser,
        victims: sample.victims,
        location: sample.location,
        discoveryReport: sample.discoveryReport,
        weaponName: sample.weapon.name,
        weaponTrait: sample.weapon.trait,
        locations: sample.locations,
        suspects: sample.suspects,
        hasTwist: Boolean(sample.hasTwist),
        twistNote: sample.twistNote ?? null,
        darkerTheme: Boolean(sample.darkerTheme),
        fieldAgents: sample.fieldAgents ?? [],
        status: "published",
        publishedAt: new Date(),
        publishedBy: "seed",
      },
    });
    invCount += 1;
  }
  console.log(
    `Seeded ${invCount} Investigation Mode fictional cases (published → /fictional only).`,
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
