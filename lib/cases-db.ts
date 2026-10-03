import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/lib/generated/prisma-cases/client";
import path from "node:path";
import {
  attachInvestigationDelegates,
  hasPrismaInvestigationDelegates,
} from "@/lib/investigation/libsql-delegates";

/**
 * Dedicated cases-research Prisma client (SQLite file).
 * Research agent and /pb-case write ONLY here — never users/auth/settings.
 * Lazily created so `next build` works without a live cases DB.
 *
 * CASES_DATABASE_URL examples:
 *   file:./data/detective_cases.db
 *   file:/absolute/path/to/detective_cases.db
 *
 * Investigation Mode models (`investigationCase`) may be missing from a stale
 * generated client (pull without `db:generate:cases`, or Next HMR singleton).
 * We invalidate/recreate when needed and attach LibSQL shims as a fallback so
 * fictional generate keeps working end-to-end after migrate.
 */

/** Bump when cases-schema models change so HMR singletons are discarded. */
export const CASES_PRISMA_CLIENT_GEN = 2;

const globalForCases = globalThis as unknown as {
  casesPrisma: PrismaClient | undefined;
  casesPrismaGen: number | undefined;
};

function resolveSqliteUrl(raw: string): string {
  const trimmed = raw.trim().replace(/^"|"$/g, "");
  if (!trimmed.startsWith("file:")) {
    throw new Error(
      `CASES_DATABASE_URL must be a SQLite file URL (file:...). Got: ${trimmed.slice(0, 40)}`,
    );
  }
  const filePart = trimmed.slice("file:".length);
  // Absolute Unix or Windows path
  if (filePart.startsWith("/") || /^[A-Za-z]:[\\/]/.test(filePart)) {
    return `file:${filePart.replace(/\\/g, "/")}`;
  }
  // Relative to process cwd (repo root when running Next / prisma seed)
  const abs = path.resolve(process.cwd(), filePart);
  return `file:${abs.replace(/\\/g, "/")}`;
}

function createCasesPrismaClient(): PrismaClient {
  const connectionString = process.env.CASES_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "CASES_DATABASE_URL is not set. Use file:./data/detective_cases.db (see .env.example).",
    );
  }

  const url = resolveSqliteUrl(connectionString);
  const adapter = new PrismaLibSql({ url });
  const client = new PrismaClient({ adapter });
  // Always ensure Investigation Mode delegates exist (native Prisma or LibSQL shim).
  attachInvestigationDelegates(client);
  return client;
}

export function getCasesPrisma(): PrismaClient {
  const staleGen = globalForCases.casesPrismaGen !== CASES_PRISMA_CLIENT_GEN;
  const staleModels =
    !globalForCases.casesPrisma ||
    !hasPrismaInvestigationDelegates(globalForCases.casesPrisma);

  if (!globalForCases.casesPrisma || staleGen || staleModels) {
    // Drop stale HMR singleton from before Investigation Mode models existed.
    globalForCases.casesPrisma = createCasesPrismaClient();
    globalForCases.casesPrismaGen = CASES_PRISMA_CLIENT_GEN;
  }

  // Re-attach if somehow stripped (defensive).
  attachInvestigationDelegates(globalForCases.casesPrisma);
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
