/**
 * LOCAL / CI DEV SEED ONLY — do not run against production databases.
 *
 * Includes: demo_detective + admin_ops (known passwords), FC-001/FC-002
 * fictional training cases, and DEV-* Case UI stubs (isDevStub=true).
 *
 * Production path: `npm run db:seed` (achievements only; no real-case fabrication).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { sealEmail } from "../lib/crypto/email";
import { generatePublicDetectiveId } from "../lib/identity/public-id";
import { hashPassword } from "../lib/password";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log("Seeding DETECTIVE (fictional demo only)…");

  const passwordHash = await hashPassword("detective-demo-2026");
  const adminPasswordHash = await hashPassword("detective-admin-2026");
  const demoSealed = sealEmail("demo@detective.local");
  const adminSealed = sealEmail("admin@detective.local");

  const demoUser = await prisma.user.upsert({
    where: { username: "demo_detective" },
    update: {
      detectiveXP: 120,
      detectiveRank: "JUNIOR",
      bio: "Seeded demo account for local development.",
      passwordHash,
      email: null,
      emailEncrypted: demoSealed.emailEncrypted,
      emailBlindIndex: demoSealed.emailBlindIndex,
      emailVerifiedAt: new Date(),
    },
    create: {
      username: "demo_detective",
      email: null,
      emailEncrypted: demoSealed.emailEncrypted,
      emailBlindIndex: demoSealed.emailBlindIndex,
      displayName: "Demo Detective",
      passwordHash,
      emailVerifiedAt: new Date(),
      role: "USER",
      publicId: generatePublicDetectiveId(),
      detectiveXP: 120,
      detectiveRank: "JUNIOR",
      bio: "Seeded demo account for local development.",
    },
  });

  // Phase 9 — admin operator (ADMIN role). Documented in README.
  await prisma.user.upsert({
    where: { username: "admin_ops" },
    update: {
      role: "ADMIN",
      passwordHash: adminPasswordHash,
      email: null,
      emailEncrypted: adminSealed.emailEncrypted,
      emailBlindIndex: adminSealed.emailBlindIndex,
      emailVerifiedAt: new Date(),
      suspendedAt: null,
      displayName: "Ops Admin",
    },
    create: {
      username: "admin_ops",
      email: null,
      emailEncrypted: adminSealed.emailEncrypted,
      emailBlindIndex: adminSealed.emailBlindIndex,
      displayName: "Ops Admin",
      passwordHash: adminPasswordHash,
      emailVerifiedAt: new Date(),
      role: "ADMIN",
      publicId: generatePublicDetectiveId(),
      detectiveXP: 0,
      detectiveRank: "NOVICE",
      bio: "Seeded ADMIN account for command deck testing.",
    },
  });

  // Owner admin account — role/flag only in access checks (never hardcode username there).
  // ADMIN_USERNAME default is abed for /pb-case; ensure this user has ADMIN role.
  const abedPasswordHash = await hashPassword(
    process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() || "detective-abed-2026",
  );
  const abedSealed = sealEmail("abed@detective.local");
  await prisma.user.upsert({
    where: { username: "abed" },
    update: {
      role: "ADMIN",
      passwordHash: abedPasswordHash,
      email: null,
      emailEncrypted: abedSealed.emailEncrypted,
      emailBlindIndex: abedSealed.emailBlindIndex,
      emailVerifiedAt: new Date(),
      suspendedAt: null,
      displayName: "Abed",
      comped: false,
    },
    create: {
      username: "abed",
      email: null,
      emailEncrypted: abedSealed.emailEncrypted,
      emailBlindIndex: abedSealed.emailBlindIndex,
      displayName: "Abed",
      passwordHash: abedPasswordHash,
      emailVerifiedAt: new Date(),
      role: "ADMIN",
      publicId: generatePublicDetectiveId(),
      detectiveXP: 0,
      detectiveRank: "NOVICE",
      bio: "Seeded owner ADMIN (role-based access; username not used in fictional gates).",
    },
  });

  const achievements = [
    {
      code: "FIRST_BRIEFING",
      title: "First Briefing",
      description: "Open your first fictional case file.",
      xpReward: 25,
    },
    {
      code: "BOARD_BUILDER",
      title: "Board Builder",
      description: "Create five investigation connections.",
      xpReward: 50,
    },
    {
      code: "HOUSE_1147",
      title: "The House at 11:47",
      description: "Complete fictional case FC-001 with a passing score.",
      xpReward: 75,
    },
    {
      code: "SHARP_EYE",
      title: "Sharp Eye",
      description: "Score 90+ on a fictional case.",
      xpReward: 40,
    },
    {
      code: "PERFECT_CASE",
      title: "Perfect Case",
      description: "Score a perfect 100 on a fictional case.",
      xpReward: 60,
    },
    {
      code: "STREAK_3",
      title: "Three-Day Watch",
      description: "Maintain a 3-day fictional investigation streak.",
      xpReward: 35,
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: achievement,
      create: achievement,
    });
  }

  // Wipe prior FC-001 graph for idempotent re-seed (solution → suspects cascade order)
  const existing = await prisma.fictionalCase.findUnique({
    where: { caseCode: "FC-001" },
  });
  if (existing) {
    await prisma.solution.deleteMany({ where: { fictionalCaseId: existing.id } });
    await prisma.fictionalCase.delete({ where: { id: existing.id } });
  }

  const fictionalCase = await prisma.fictionalCase.create({
    data: {
      caseCode: "FC-001",
      title: "THE HOUSE AT 11:47",
      slug: "the-house-at-1147",
      synopsis:
        "[FICTIONAL TRAINING CASE] At 11:47 p.m., a power cut hits the lakeside rental known as Ashwood House. When lights return, a guest is missing, a study window is open to the storm, and every remaining guest has a story that almost fits. This file is invented for detective training — it is not a real crime.",
      setting: "Ashwood House, Lake Merrow (fictional locale)",
      difficulty: "NOVICE",
      estimatedMinutes: 45,
      isFictional: true,
      published: true,
      publishedAt: new Date(),
    },
  });

  const suspectDefs = [
    {
      code: "S1",
      name: "Maren Holt",
      age: 42,
      occupation: "Host / property manager",
      bio: "Rents Ashwood House to small groups. Says she was in the kitchen resetting the breaker.",
      publicAlibi: "Kitchen and utility closet during the blackout.",
      sortOrder: 1,
    },
    {
      code: "S2",
      name: "Jonah Vale",
      age: 29,
      occupation: "Freelance photographer",
      bio: "Visiting for a lakeside shoot. Claims he never left the upstairs landing.",
      publicAlibi: "Landing outside the guest rooms with a flashlight.",
      sortOrder: 2,
    },
    {
      code: "S3",
      name: "Dr. Priya Shah",
      age: 51,
      occupation: "Historian",
      bio: "Researching local folklore. Was reviewing notes in the library wing.",
      publicAlibi: "Library wing with a battery lantern.",
      sortOrder: 3,
    },
    {
      code: "S4",
      name: "Eli Navarro",
      age: 34,
      occupation: "Boat mechanic",
      bio: "Old friend of the missing guest. Arrived late after repairing a skiff.",
      publicAlibi: "Mudroom cleaning oil from his hands.",
      sortOrder: 4,
    },
    {
      code: "S5",
      name: "Claire Dunn",
      age: 27,
      occupation: "Graduate student",
      bio: "Organized the weekend gathering. Says she checked on everyone with her phone light.",
      publicAlibi: "Hallway rounds during the outage.",
      sortOrder: 5,
    },
  ];

  const suspects = [];
  for (const def of suspectDefs) {
    suspects.push(
      await prisma.suspect.create({
        data: { ...def, fictionalCaseId: fictionalCase.id },
      }),
    );
  }

  const evidenceDefs = [
    {
      code: "E01",
      title: "Open study window",
      description: "East study window latched open; rain blown onto the desk blotter.",
      type: "PHYSICAL" as const,
      foundLocation: "Study",
      isRedHerring: false,
    },
    {
      code: "E02",
      title: "Breaker panel scuff",
      description: "Fresh scrape on the utility closet floor near the breaker box.",
      type: "PHYSICAL" as const,
      foundLocation: "Utility closet",
      isRedHerring: false,
    },
    {
      code: "E03",
      title: "Phone flashlight log",
      description: "Claire’s phone shows flashlight toggled four times between 11:47 and 11:55.",
      type: "DIGITAL" as const,
      foundLocation: "Claire’s phone",
      isRedHerring: false,
    },
    {
      code: "E04",
      title: "Oil rag",
      description: "Shop rag with marine grease found on the mudroom bench.",
      type: "PHYSICAL" as const,
      foundLocation: "Mudroom",
      isRedHerring: true,
    },
    {
      code: "E05",
      title: "Library lantern",
      description: "Battery lantern still warm on the library side table.",
      type: "PHYSICAL" as const,
      foundLocation: "Library",
      isRedHerring: true,
    },
    {
      code: "E06",
      title: "Torn coat thread",
      description: "Dark wool thread caught on the study window latch — matches Jonah’s coat weave.",
      type: "FORENSIC" as const,
      foundLocation: "Study window",
      isRedHerring: false,
    },
    {
      code: "E07",
      title: "Guest ledger",
      description: "Check-in ledger shows Eli arrived at 22:10; missing guest marked ‘present’ at dinner.",
      type: "DOCUMENT" as const,
      foundLocation: "Front hall",
      isRedHerring: false,
    },
    {
      code: "E08",
      title: "Storm photo burst",
      description: "Jonah’s camera has a burst at 23:44 facing the lake — no people in frame.",
      type: "PHOTO" as const,
      foundLocation: "Jonah’s camera",
      isRedHerring: true,
    },
    {
      code: "E09",
      title: "Partial footprint",
      description: "Wet print on the study rug pointing toward the hallway, size consistent with men’s boot.",
      type: "FORENSIC" as const,
      foundLocation: "Study",
      isRedHerring: false,
    },
    {
      code: "E10",
      title: "Handwritten note",
      description: "Unsigned note in the missing guest’s room: ‘Meet me at the study after the lights fail.’",
      type: "DOCUMENT" as const,
      foundLocation: "Guest room B",
      isRedHerring: false,
    },
  ];

  for (const [index, def] of evidenceDefs.entries()) {
    await prisma.evidence.create({
      data: {
        ...def,
        fictionalCaseId: fictionalCase.id,
        sortOrder: index + 1,
        foundAt: new Date("2026-03-14T23:50:00.000Z"),
      },
    });
  }

  const eventDefs = [
    {
      occurredAt: "2026-03-14T21:00:00.000Z",
      title: "Dinner concludes",
      description: "All six guests were accounted for in the dining room.",
    },
    {
      occurredAt: "2026-03-14T22:10:00.000Z",
      title: "Eli arrives",
      description: "Eli Navarro checks in late; mud on boots noted by Maren.",
    },
    {
      occurredAt: "2026-03-14T23:30:00.000Z",
      title: "Storm intensifies",
      description: "Wind warnings; guests move to sitting room and private spaces.",
    },
    {
      occurredAt: "2026-03-14T23:44:00.000Z",
      title: "Camera burst",
      description: "Jonah’s camera records a lakeside burst from an upper window.",
    },
    {
      occurredAt: "2026-03-14T23:47:00.000Z",
      title: "Blackout",
      description: "House power fails. Emergency lights do not engage.",
    },
    {
      occurredAt: "2026-03-14T23:51:00.000Z",
      title: "Breaker reset",
      description: "Power returns after activity at the utility closet.",
    },
    {
      occurredAt: "2026-03-14T23:55:00.000Z",
      title: "Guest missing",
      description: "Claire reports the missing guest is not in room B; study window found open.",
    },
    {
      occurredAt: "2026-03-15T00:20:00.000Z",
      title: "Shore search",
      description: "Guests search the dock and path; no sign of the missing guest.",
    },
  ];

  for (const [index, def] of eventDefs.entries()) {
    await prisma.fictionalEvent.create({
      data: {
        fictionalCaseId: fictionalCase.id,
        occurredAt: new Date(def.occurredAt),
        title: def.title,
        description: def.description,
        sortOrder: index + 1,
      },
    });
  }

  const witnessDefs = [
    {
      code: "W1",
      witnessName: "Maren Holt",
      statement:
        "I went straight to the breaker. Someone else was in that hall — I heard boots, not soft soles.",
      recordedAt: "2026-03-15T01:00:00.000Z",
    },
    {
      code: "W2",
      witnessName: "Jonah Vale",
      statement:
        "I stayed on the landing. I never entered the study. My coat was drying downstairs.",
      recordedAt: "2026-03-15T01:10:00.000Z",
    },
    {
      code: "W3",
      witnessName: "Dr. Priya Shah",
      statement:
        "The library door was ajar when lights returned. I did not see anyone cross the main hall.",
      recordedAt: "2026-03-15T01:20:00.000Z",
    },
    {
      code: "W4",
      witnessName: "Eli Navarro",
      statement:
        "I was cleaning grease off my hands. I heard the window slam upstairs after power came back.",
      recordedAt: "2026-03-15T01:30:00.000Z",
    },
    {
      code: "W5",
      witnessName: "Claire Dunn",
      statement:
        "I checked rooms with my phone light. Room B was empty. The study smelled like rain and wool.",
      recordedAt: "2026-03-15T01:40:00.000Z",
    },
  ];

  for (const [index, def] of witnessDefs.entries()) {
    await prisma.witnessStatement.create({
      data: {
        fictionalCaseId: fictionalCase.id,
        code: def.code,
        witnessName: def.witnessName,
        statement: def.statement,
        recordedAt: new Date(def.recordedAt),
        sortOrder: index + 1,
      },
    });
  }

  const culprit = suspects.find((s) => s.code === "S2");
  if (!culprit) throw new Error("Culprit suspect S2 missing");

  await prisma.solution.create({
    data: {
      fictionalCaseId: fictionalCase.id,
      culpritSuspectId: culprit.id,
      summary:
        "[FICTIONAL] Jonah Vale staged a lakeside alibi photo, cut power, and used the study window path.",
      explanation:
        "Training solution only: the coat thread on the latch, wet boot print, unsigned note, and false landing alibi converge on Jonah. Oil rag and library lantern are red herrings. This solution must remain server-side in product phases.",
      keyEvidenceCodes: ["E01", "E06", "E09", "E10", "E02"],
      motiveKeywords: [
        "alibi",
        "staged",
        "power",
        "blackout",
        "study",
        "window",
        "landing",
        "photo",
      ],
      timelineKeywords: [
        "23:47",
        "11:47",
        "blackout",
        "breaker",
        "23:44",
        "23:51",
        "study",
        "power",
      ],
      reasoningKeywords: [
        "thread",
        "coat",
        "footprint",
        "note",
        "jonah",
        "false",
        "landing",
        "window",
        "herring",
      ],
    },
  });

  await prisma.userAchievement.upsert({
    where: {
      userId_achievementId: {
        userId: demoUser.id,
        achievementId: (await prisma.achievement.findUniqueOrThrow({
          where: { code: "FIRST_BRIEFING" },
        })).id,
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      achievementId: (await prisma.achievement.findUniqueOrThrow({
        where: { code: "FIRST_BRIEFING" },
      })).id,
    },
  });

  // Development placeholders for Case Database UI — NOT real crimes.
  const devStubs = [
    {
      caseCode: "DEV-00001",
      title: "[DEV] Case database wiring stub",
      slug: "dev-case-database-wiring-stub",
      summary:
        "DEVELOPMENT ONLY. This record exists so the Case Database UI can be tested. It is not a real investigation and invents no crime facts.",
      publicNotes:
        "Public info placeholder: platform QA checklist for list/detail/filter routes.",
      location: "Development lab",
      countryCode: "XX",
      year: 2026,
      type: "OTHER" as const,
      status: "OPEN" as const,
      priority: "LOW" as const,
      contentLabel: "VERIFIED" as const,
      lastVerifiedAt: new Date("2026-09-28T12:00:00.000Z"),
      events: [
        {
          title: "Stub created",
          description: "Seed inserted this development placeholder.",
          contentLabel: "VERIFIED" as const,
        },
      ],
      persons: [
        {
          name: "N/A — Development",
          role: "OTHER" as const,
          notes: "No real persons. Development stub only.",
          contentLabel: "VERIFIED" as const,
        },
      ],
      sources: [
        {
          title: "DETECTIVE internal seed documentation",
          url: "https://github.com/JoKeS69/detectives",
          publisher: "DETECTIVE",
          citationNote: "Points at the product repo — not a crime source.",
        },
      ],
    },
    {
      caseCode: "DEV-00002",
      title: "[DEV] Filter / status badge stub",
      slug: "dev-filter-status-badge-stub",
      summary:
        "DEVELOPMENT ONLY. Used to exercise COLD status styling and REPORTED labels. Contains no real-world allegations.",
      publicNotes: "Sample public field for UI review. Not evidentiary.",
      location: "Staging environment",
      countryCode: "XX",
      year: 2025,
      type: "UNKNOWN" as const,
      status: "COLD" as const,
      priority: "MEDIUM" as const,
      contentLabel: "REPORTED" as const,
      lastVerifiedAt: new Date("2026-09-01T08:00:00.000Z"),
      events: [
        {
          title: "UI review note",
          description: "Reported-label styling check (development).",
          contentLabel: "REPORTED" as const,
        },
        {
          title: "Theory sandbox",
          description: "Example USER THEORY row for badge contrast — fictional UI copy only.",
          contentLabel: "USER_THEORY" as const,
        },
      ],
      persons: [],
      sources: [
        {
          title: "Phase 4 development notes",
          url: "https://github.com/JoKeS69/detectives",
          publisher: "DETECTIVE",
          citationNote: "Development citation stub.",
        },
      ],
    },
    {
      caseCode: "DEV-00003",
      title: "[DEV] Closed pipeline stub",
      slug: "dev-closed-pipeline-stub",
      summary:
        "DEVELOPMENT ONLY. Represents a closed workflow state for filters. No crime narrative.",
      publicNotes: "Closed-state public notes for QA.",
      location: "QA cluster",
      countryCode: "US",
      year: 2024,
      type: "OTHER" as const,
      status: "CLOSED" as const,
      priority: "LOW" as const,
      contentLabel: "VERIFIED" as const,
      lastVerifiedAt: new Date("2026-08-15T18:00:00.000Z"),
      events: [
        {
          title: "Marked closed in seed",
          description: "Pipeline status test only.",
          contentLabel: "VERIFIED" as const,
        },
      ],
      persons: [],
      sources: [],
    },
    {
      caseCode: "DEV-00004",
      title: "[DEV] Unsolved label stub",
      slug: "dev-unsolved-label-stub",
      summary:
        "DEVELOPMENT ONLY. Exercises UNSOLVED status and MISSING type filters without inventing a real missing-person case.",
      publicNotes: "Unsolved-status UI fixture.",
      location: "Mock region",
      countryCode: "GB",
      year: 2026,
      type: "MISSING" as const,
      status: "UNSOLVED" as const,
      priority: "HIGH" as const,
      contentLabel: "REPORTED" as const,
      lastVerifiedAt: null,
      events: [],
      persons: [
        {
          name: "Placeholder subject (development)",
          role: "OTHER" as const,
          notes: "Not a real person.",
          contentLabel: "REPORTED" as const,
        },
      ],
      sources: [
        {
          title: "UI fixture source",
          url: "https://example.com/dev-stub",
          publisher: "example.com",
          citationNote: "Synthetic URL for citation layout tests.",
        },
      ],
    },
  ];

  for (const stub of devStubs) {
    const { events, persons, sources, ...caseFields } = stub;
    await prisma.case.upsert({
      where: { caseCode: stub.caseCode },
      update: {
        ...caseFields,
        isDevStub: true,
        published: true,
        publishedAt: new Date(),
      },
      create: {
        ...caseFields,
        isDevStub: true,
        published: true,
        publishedAt: new Date(),
        events: {
          create: events.map((event, index) => ({
            ...event,
            sortOrder: index + 1,
            occurredAt: new Date("2026-09-28T10:00:00.000Z"),
          })),
        },
        persons: { create: persons },
        sources: {
          create: sources.map((source) => ({
            ...source,
            accessedAt: new Date("2026-09-28T10:00:00.000Z"),
          })),
        },
      },
    });
  }

  // Phase 5 — sample USER THEORY discussion on DEV stub (idempotent by title+case)
  const wiringStub = await prisma.case.findUnique({
    where: { caseCode: "DEV-00001" },
    select: { id: true },
  });
  if (wiringStub) {
    const existingDiscussion = await prisma.discussion.findFirst({
      where: {
        caseId: wiringStub.id,
        title: "[DEV] Timeline cross-check theory",
      },
      select: { id: true },
    });
    if (!existingDiscussion) {
      const discussion = await prisma.discussion.create({
        data: {
          caseId: wiringStub.id,
          authorId: demoUser.id,
          title: "[DEV] Timeline cross-check theory",
          body: "Development-only theory thread. Comparing stub timeline entries for UI wiring — not a real accusation.",
          contentLabel: "USER_THEORY",
          status: "OPEN",
        },
      });
      await prisma.comment.create({
        data: {
          discussionId: discussion.id,
          authorId: demoUser.id,
          body: "Seed comment: labels must stay USER THEORY on community posts.",
          contentLabel: "USER_THEORY",
        },
      });
    }
  }

  const counts = {
    users: await prisma.user.count(),
    fictionalCases: await prisma.fictionalCase.count(),
    suspects: await prisma.suspect.count({ where: { fictionalCaseId: fictionalCase.id } }),
    evidence: await prisma.evidence.count({ where: { fictionalCaseId: fictionalCase.id } }),
    events: await prisma.fictionalEvent.count({ where: { fictionalCaseId: fictionalCase.id } }),
    witnessStatements: await prisma.witnessStatement.count({
      where: { fictionalCaseId: fictionalCase.id },
    }),
    solutions: await prisma.solution.count({ where: { fictionalCaseId: fictionalCase.id } }),
    achievements: await prisma.achievement.count(),
    realCases: await prisma.case.count(),
    devStubs: await prisma.case.count({ where: { isDevStub: true } }),
    discussions: await prisma.discussion.count(),
    comments: await prisma.comment.count(),
  };

  // Phase 10 — ADVANCED fictional stub for Investigator Pro gate demos (no solution).
  await prisma.fictionalCase.upsert({
    where: { caseCode: "FC-002" },
    update: {
      title: "SIGNAL CUT AT DOCK 9",
      slug: "signal-cut-at-dock-9",
      synopsis:
        "[FICTIONAL · ADVANCED] A coastal relay loses telemetry during a storm drill. Investigator Pro training file — invented scenario, not a real crime.",
      setting: "Dock 9 relay (fictional)",
      difficulty: "ADVANCED",
      estimatedMinutes: 60,
      published: true,
      publishedAt: new Date(),
      isFictional: true,
    },
    create: {
      caseCode: "FC-002",
      title: "SIGNAL CUT AT DOCK 9",
      slug: "signal-cut-at-dock-9",
      synopsis:
        "[FICTIONAL · ADVANCED] A coastal relay loses telemetry during a storm drill. Investigator Pro training file — invented scenario, not a real crime.",
      setting: "Dock 9 relay (fictional)",
      difficulty: "ADVANCED",
      estimatedMinutes: 60,
      published: true,
      publishedAt: new Date(),
      isFictional: true,
    },
  });

  console.log("Seed complete:", counts);
  console.log("Demo login: demo_detective / detective-demo-2026");
  console.log("Admin login: admin_ops / detective-admin-2026 (role ADMIN)");
  console.log(
    "Owner admin: abed / (ADMIN_BOOTSTRAP_PASSWORD or detective-abed-2026) — role ADMIN",
  );
  console.log("FC-001 is FICTIONAL (free). FC-002 ADVANCED requires Investigator Pro.");
  console.log("Real Case rows are DEV stubs only — no crime claims.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
