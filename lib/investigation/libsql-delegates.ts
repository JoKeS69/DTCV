/**
 * LibSQL-backed Investigation Mode delegates.
 * Used when the generated Prisma cases client is stale (missing investigationCase)
 * — common after pulling schema changes without regenerating / with a hot Next singleton.
 */
import { createClient, type Client } from "@libsql/client";
import path from "node:path";
import { randomBytes } from "node:crypto";

function resolveSqlitePath(raw: string): string {
  const trimmed = raw.trim().replace(/^"|"$/g, "");
  if (!trimmed.startsWith("file:")) {
    throw new Error(
      `CASES_DATABASE_URL must be a SQLite file URL (file:...). Got: ${trimmed.slice(0, 40)}`,
    );
  }
  const filePart = trimmed.slice("file:".length);
  if (filePart.startsWith("/") || /^[A-Za-z]:[\\/]/.test(filePart)) {
    return filePart.replace(/\\/g, "/");
  }
  return path.resolve(process.cwd(), filePart).replace(/\\/g, "/");
}

function getLibsql(): Client {
  const raw = process.env.CASES_DATABASE_URL;
  if (!raw) {
    throw new Error(
      "CASES_DATABASE_URL is not set. Use file:./data/detective_cases.db",
    );
  }
  const url = `file:${resolveSqlitePath(raw)}`;
  return createClient({ url });
}

function cuidLike(): string {
  return `c${randomBytes(12).toString("hex")}`;
}

function jsonParse<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function jsonStringify(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function boolToInt(v: unknown): number {
  return v ? 1 : 0;
}

function intToBool(v: unknown): boolean {
  return v === 1 || v === true || v === "1";
}

type CaseRow = Record<string, unknown>;

function mapCaseRow(row: CaseRow) {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    teaser: String(row.teaser ?? ""),
    victims: jsonParse(row.victims, [] as unknown[]),
    location: String(row.location ?? ""),
    discoveryReport: String(row.discoveryReport ?? ""),
    weaponName: String(row.weaponName ?? ""),
    weaponTrait: String(row.weaponTrait ?? ""),
    locations: jsonParse(row.locations, [] as unknown[]),
    suspects: jsonParse(row.suspects, [] as unknown[]),
    hasTwist: intToBool(row.hasTwist),
    twistNote: row.twistNote == null ? null : String(row.twistNote),
    darkerTheme: intToBool(row.darkerTheme),
    fieldAgents: jsonParse(row.fieldAgents, [] as unknown[]),
    status: String(row.status ?? "draft"),
    publishedAt: row.publishedAt ? new Date(String(row.publishedAt)) : null,
    publishedBy: row.publishedBy == null ? null : String(row.publishedBy),
    createdAt: new Date(String(row.createdAt)),
    updatedAt: new Date(String(row.updatedAt)),
  };
}

function mapStateRow(row: CaseRow) {
  return {
    id: String(row.id),
    caseId: String(row.caseId),
    userId: row.userId == null ? null : String(row.userId),
    playerKey: String(row.playerKey),
    displayName: String(row.displayName),
    status: String(row.status ?? "unsolved"),
    wrongAccusations: Number(row.wrongAccusations ?? 0),
    inspectedLocationIds: jsonParse(row.inspectedLocationIds, [] as unknown[]),
    reviewedSuspectIds: jsonParse(row.reviewedSuspectIds, [] as unknown[]),
    backgroundCheckedIds: jsonParse(row.backgroundCheckedIds, [] as unknown[]),
    alibiVerifiedIds: jsonParse(row.alibiVerifiedIds, [] as unknown[]),
    boardConnections: jsonParse(row.boardConnections, [] as unknown[]),
    caseLog: jsonParse(row.caseLog, [] as unknown[]),
    chatHistory: jsonParse(row.chatHistory, {} as Record<string, unknown>),
    closedAt: row.closedAt ? new Date(String(row.closedAt)) : null,
    solutionReveal: row.solutionReveal == null ? null : jsonParse(row.solutionReveal, null),
    createdAt: new Date(String(row.createdAt)),
    updatedAt: new Date(String(row.updatedAt)),
  };
}

async function assertInvestigationTables(db: Client) {
  try {
    await db.execute(
      "SELECT 1 FROM investigation_cases LIMIT 1",
    );
  } catch {
    throw new Error(
      "investigation_cases table missing. Run: npx prisma migrate deploy --config prisma-cases.config.ts && npm run db:cases:seed",
    );
  }
}

function buildOrderBy(orderBy: unknown): string {
  if (!orderBy) return "ORDER BY updatedAt DESC";
  const list = Array.isArray(orderBy) ? orderBy : [orderBy];
  const parts: string[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    for (const [k, v] of Object.entries(item as Record<string, string>)) {
      const dir = String(v).toLowerCase() === "asc" ? "ASC" : "DESC";
      // only allow known columns
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)) {
        parts.push(`${k} ${dir}`);
      }
    }
  }
  return parts.length ? `ORDER BY ${parts.join(", ")}` : "ORDER BY updatedAt DESC";
}

export function createInvestigationCaseDelegate() {
  return {
    async findUnique(args: { where: { id?: string; slug?: string }; select?: Record<string, boolean> }) {
      const db = getLibsql();
      await assertInvestigationTables(db);
      const where = args.where;
      let rs;
      if (where.id) {
        rs = await db.execute({
          sql: "SELECT * FROM investigation_cases WHERE id = ? LIMIT 1",
          args: [where.id],
        });
      } else if (where.slug) {
        rs = await db.execute({
          sql: "SELECT * FROM investigation_cases WHERE slug = ? LIMIT 1",
          args: [where.slug],
        });
      } else {
        return null;
      }
      const row = rs.rows[0] as CaseRow | undefined;
      if (!row) return null;
      const mapped = mapCaseRow(row);
      if (!args.select) return mapped;
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(args.select)) {
        if (args.select[key]) out[key] = (mapped as Record<string, unknown>)[key];
      }
      return out;
    },

    async findFirst(args?: {
      where?: Record<string, unknown>;
      orderBy?: unknown;
      select?: Record<string, boolean>;
    }) {
      const many = await this.findMany({
        where: args?.where,
        orderBy: args?.orderBy,
        take: 1,
        select: args?.select,
      });
      return many[0] ?? null;
    },

    async findMany(args?: {
      where?: Record<string, unknown>;
      orderBy?: unknown;
      take?: number;
      select?: Record<string, boolean>;
    }) {
      const db = getLibsql();
      await assertInvestigationTables(db);
      const clauses: string[] = [];
      const params: Array<string | number | null> = [];
      const where = args?.where ?? {};
      if (typeof where.status === "string") {
        clauses.push("status = ?");
        params.push(where.status);
      }
      if (where.OR && Array.isArray(where.OR)) {
        const orParts: string[] = [];
        for (const part of where.OR) {
          if (part && typeof part === "object") {
            if ("id" in part) {
              orParts.push("id = ?");
              params.push(String((part as { id: string }).id));
            }
            if ("slug" in part) {
              orParts.push("slug = ?");
              params.push(String((part as { slug: string }).slug));
            }
          }
        }
        if (orParts.length) clauses.push(`(${orParts.join(" OR ")})`);
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const orderSql = buildOrderBy(args?.orderBy);
      const take = Math.min(Math.max(Number(args?.take ?? 100) || 100, 1), 500);
      const rs = await db.execute({
        sql: `SELECT * FROM investigation_cases ${whereSql} ${orderSql} LIMIT ?`,
        args: [...params, take],
      });
      return rs.rows.map((row) => {
        const mapped = mapCaseRow(row as CaseRow);
        if (!args?.select) return mapped;
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(args.select)) {
          if (args.select[key]) out[key] = (mapped as Record<string, unknown>)[key];
        }
        return out;
      });
    },

    async create(args: { data: Record<string, unknown> }) {
      const db = getLibsql();
      await assertInvestigationTables(db);
      const d = args.data;
      const id = String(d.id ?? cuidLike());
      const now = new Date().toISOString();
      await db.execute({
        sql: `INSERT INTO investigation_cases (
          id, slug, title, teaser, victims, location, discoveryReport,
          weaponName, weaponTrait, locations, suspects, hasTwist, twistNote,
          darkerTheme, fieldAgents, status, publishedAt, publishedBy, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          String(d.slug),
          String(d.title),
          String(d.teaser ?? ""),
          jsonStringify(d.victims ?? []),
          String(d.location ?? ""),
          String(d.discoveryReport ?? ""),
          String(d.weaponName ?? ""),
          String(d.weaponTrait ?? ""),
          jsonStringify(d.locations ?? []),
          jsonStringify(d.suspects ?? []),
          boolToInt(d.hasTwist),
          d.twistNote == null ? null : String(d.twistNote),
          boolToInt(d.darkerTheme),
          jsonStringify(d.fieldAgents ?? []),
          String(d.status ?? "draft"),
          d.publishedAt ? new Date(d.publishedAt as string | Date).toISOString() : null,
          d.publishedBy == null ? null : String(d.publishedBy),
          now,
          now,
        ],
      });
      return this.findUnique({ where: { id } });
    },

    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      const db = getLibsql();
      await assertInvestigationTables(db);
      const d = args.data;
      const sets: string[] = [];
      const params: Array<string | number | null> = [];
      const map: Record<string, (v: unknown) => string | number | null> = {
        slug: (v) => String(v),
        title: (v) => String(v),
        teaser: (v) => String(v),
        victims: (v) => jsonStringify(v),
        location: (v) => String(v),
        discoveryReport: (v) => String(v),
        weaponName: (v) => String(v),
        weaponTrait: (v) => String(v),
        locations: (v) => jsonStringify(v),
        suspects: (v) => jsonStringify(v),
        hasTwist: (v) => boolToInt(v),
        twistNote: (v) => (v == null ? null : String(v)),
        darkerTheme: (v) => boolToInt(v),
        fieldAgents: (v) => jsonStringify(v),
        status: (v) => String(v),
        publishedAt: (v) =>
          v == null ? null : new Date(v as string | Date).toISOString(),
        publishedBy: (v) => (v == null ? null : String(v)),
      };
      for (const [k, transform] of Object.entries(map)) {
        if (k in d) {
          sets.push(`${k} = ?`);
          params.push(transform(d[k]));
        }
      }
      sets.push("updatedAt = ?");
      params.push(new Date().toISOString());
      params.push(args.where.id);
      await db.execute({
        sql: `UPDATE investigation_cases SET ${sets.join(", ")} WHERE id = ?`,
        args: params,
      });
      return this.findUnique({ where: { id: args.where.id } });
    },

    async upsert(args: {
      where: { slug: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) {
      const existing = await this.findUnique({ where: { slug: args.where.slug } });
      if (existing) {
        return this.update({
          where: { id: String((existing as { id: string }).id) },
          data: args.update,
        });
      }
      return this.create({
        data: { ...args.create, slug: args.where.slug },
      });
    },
  };
}

export function createInvestigationPlayerStateDelegate() {
  return {
    async findUnique(args: {
      where:
        | { id: string }
        | { caseId_playerKey: { caseId: string; playerKey: string } };
    }) {
      const db = getLibsql();
      await assertInvestigationTables(db);
      let rs;
      if ("id" in args.where) {
        rs = await db.execute({
          sql: "SELECT * FROM investigation_player_states WHERE id = ? LIMIT 1",
          args: [args.where.id],
        });
      } else {
        const { caseId, playerKey } = args.where.caseId_playerKey;
        rs = await db.execute({
          sql: "SELECT * FROM investigation_player_states WHERE caseId = ? AND playerKey = ? LIMIT 1",
          args: [caseId, playerKey],
        });
      }
      const row = rs.rows[0] as CaseRow | undefined;
      return row ? mapStateRow(row) : null;
    },

    async findMany(args?: {
      where?: { playerKey?: string; caseId?: { in?: string[] } };
    }) {
      const db = getLibsql();
      await assertInvestigationTables(db);
      const clauses: string[] = [];
      const params: Array<string | number | null> = [];
      if (args?.where?.playerKey) {
        clauses.push("playerKey = ?");
        params.push(args.where.playerKey);
      }
      if (args?.where?.caseId && Array.isArray(args.where.caseId.in)) {
        const ids = args.where.caseId.in;
        if (!ids.length) return [];
        clauses.push(`caseId IN (${ids.map(() => "?").join(",")})`);
        params.push(...ids);
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const rs = await db.execute({
        sql: `SELECT * FROM investigation_player_states ${whereSql}`,
        args: params,
      });
      return rs.rows.map((row) => mapStateRow(row as CaseRow));
    },

    async create(args: { data: Record<string, unknown> }) {
      const db = getLibsql();
      await assertInvestigationTables(db);
      const d = args.data;
      const id = String(d.id ?? cuidLike());
      const now = new Date().toISOString();
      await db.execute({
        sql: `INSERT INTO investigation_player_states (
          id, caseId, userId, playerKey, displayName, status, wrongAccusations,
          inspectedLocationIds, reviewedSuspectIds, backgroundCheckedIds, alibiVerifiedIds,
          boardConnections, caseLog, chatHistory, closedAt, solutionReveal, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          String(d.caseId),
          d.userId == null ? null : String(d.userId),
          String(d.playerKey),
          String(d.displayName),
          String(d.status ?? "unsolved"),
          Number(d.wrongAccusations ?? 0),
          jsonStringify(d.inspectedLocationIds ?? []),
          jsonStringify(d.reviewedSuspectIds ?? []),
          jsonStringify(d.backgroundCheckedIds ?? []),
          jsonStringify(d.alibiVerifiedIds ?? []),
          jsonStringify(d.boardConnections ?? []),
          jsonStringify(d.caseLog ?? []),
          jsonStringify(d.chatHistory ?? {}),
          d.closedAt ? new Date(d.closedAt as string | Date).toISOString() : null,
          d.solutionReveal == null ? null : jsonStringify(d.solutionReveal),
          now,
          now,
        ],
      });
      return this.findUnique({ where: { id } });
    },

    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      const db = getLibsql();
      await assertInvestigationTables(db);
      const d = args.data;
      const sets: string[] = [];
      const params: Array<string | number | null> = [];
      const jsonFields = new Set([
        "inspectedLocationIds",
        "reviewedSuspectIds",
        "backgroundCheckedIds",
        "alibiVerifiedIds",
        "boardConnections",
        "caseLog",
        "chatHistory",
        "solutionReveal",
      ]);
      for (const [k, v] of Object.entries(d)) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)) continue;
        sets.push(`${k} = ?`);
        if (jsonFields.has(k)) params.push(jsonStringify(v));
        else if (k === "closedAt") {
          params.push(v == null ? null : new Date(v as string | Date).toISOString());
        } else if (k === "wrongAccusations") {
          params.push(Number(v ?? 0));
        } else if (v == null) {
          params.push(null);
        } else {
          params.push(String(v));
        }
      }
      sets.push("updatedAt = ?");
      params.push(new Date().toISOString());
      params.push(args.where.id);
      await db.execute({
        sql: `UPDATE investigation_player_states SET ${sets.join(", ")} WHERE id = ?`,
        args: params,
      });
      return this.findUnique({ where: { id: args.where.id } });
    },
  };
}

export function hasPrismaInvestigationDelegates(client: {
  investigationCase?: { findUnique?: unknown };
  investigationPlayerState?: { findUnique?: unknown };
}): boolean {
  return (
    typeof client.investigationCase?.findUnique === "function" &&
    typeof client.investigationPlayerState?.findUnique === "function"
  );
}

export function attachInvestigationDelegates<T extends object>(client: T): T {
  const c = client as T & {
    investigationCase?: unknown;
    investigationPlayerState?: unknown;
  };
  if (typeof (c.investigationCase as { findUnique?: unknown } | undefined)?.findUnique !== "function") {
    Object.defineProperty(c, "investigationCase", {
      value: createInvestigationCaseDelegate(),
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  if (
    typeof (c.investigationPlayerState as { findUnique?: unknown } | undefined)
      ?.findUnique !== "function"
  ) {
    Object.defineProperty(c, "investigationPlayerState", {
      value: createInvestigationPlayerStateDelegate(),
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  return client;
}
