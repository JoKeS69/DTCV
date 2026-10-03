/**
 * End-to-end smoke: LibSQL investigation shims work against a real SQLite file
 * even when the Prisma client object has no investigationCase delegate.
 */
import path from "node:path";
import { attachInvestigationDelegates } from "../lib/investigation/libsql-delegates";

async function main() {
  process.env.CASES_DATABASE_URL =
    process.env.CASES_DATABASE_URL ?? "file:./data/detective_cases.db";

  // Simulate a stale Prisma client (pre–Investigation Mode generate).
  const stale = {} as {
    investigationCase: {
      findUnique: (args: { where: { slug: string } }) => Promise<unknown>;
      create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
      findMany: (args?: { take?: number }) => Promise<unknown[]>;
    };
    caseFile?: unknown;
  };

  attachInvestigationDelegates(stale);

  if (typeof stale.investigationCase?.findUnique !== "function") {
    throw new Error("shim attach failed");
  }

  const existing = await stale.investigationCase.findUnique({
    where: { slug: "glass-harbor-ledger" },
  });
  console.log(
    "findUnique glass-harbor-ledger:",
    existing ? (existing as { title: string }).title : null,
  );

  const slug = `shim-smoke-${Date.now().toString(36)}`;
  const created = (await stale.investigationCase.create({
    data: {
      slug,
      title: "Shim Smoke Case",
      teaser: "libsql fallback path",
      victims: ["Test Victim"],
      location: "Test City",
      discoveryReport: "n/a",
      weaponName: "wrench",
      weaponTrait: "blue paint",
      locations: [
        { id: "loc-1", name: "Hall", clue: "blue paint flake near door" },
        { id: "loc-2", name: "Alley", clue: "wrench outline in dust" },
        { id: "loc-3", name: "Office", clue: "schedule conflict note" },
        { id: "loc-4", name: "Garage", clue: "boot print size 10" },
      ],
      suspects: [
        {
          id: "s1",
          name: "Avery Cole",
          role: "Neighbor",
          personality: "calm",
          motive: "dispute",
          background: "local",
          alibi: "home",
          statement: "I stayed in.",
          isGuilty: true,
          evidenceTitle: "Paint",
          evidenceDetail: "blue paint matches wrench",
        },
        {
          id: "s2",
          name: "Blake Orr",
          role: "Courier",
          personality: "nervous",
          motive: "none",
          background: "routes",
          alibi: "route 7",
          statement: "I was delivering.",
          isGuilty: false,
          evidenceTitle: "GPS",
          evidenceDetail: "route confirmed",
        },
        {
          id: "s3",
          name: "Casey Lin",
          role: "Clerk",
          personality: "sharp",
          motive: "none",
          background: "desk",
          alibi: "register till",
          statement: "I closed the till.",
          isGuilty: false,
          evidenceTitle: "Till",
          evidenceDetail: "log closed",
        },
      ],
      status: "draft",
      hasTwist: false,
      darkerTheme: false,
      fieldAgents: [],
    },
  })) as { id: string; slug: string } | null;

  if (!created?.id) throw new Error("create via shim failed");
  console.log("created via shim:", created.slug, created.id);

  const again = await stale.investigationCase.findUnique({ where: { slug } });
  if (!again) throw new Error("findUnique after create failed");
  console.log("ok", path.basename(String(process.env.CASES_DATABASE_URL)));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
