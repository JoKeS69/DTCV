import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma-cases/client";

/**
 * Dedicated cases-research Prisma client (CASES_DATABASE_URL).
 * Research agent and /pb-case write ONLY here — never users/auth/settings.
 * Lazily created so `next build` works without a live cases DB.
 */

const globalForCases = globalThis as unknown as {
  casesPrisma: PrismaClient | undefined;
};

function createCasesPrismaClient(): PrismaClient {
  const connectionString = process.env.CASES_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "CASES_DATABASE_URL is not set. Copy .env.example and configure the dedicated cases Postgres database.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export function getCasesPrisma(): PrismaClient {
  if (!globalForCases.casesPrisma) {
    globalForCases.casesPrisma = createCasesPrismaClient();
  }
  return globalForCases.casesPrisma;
}

/** Prefer `getCasesPrisma()` in new code. */
export const casesPrisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getCasesPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
