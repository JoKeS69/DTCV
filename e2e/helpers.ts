import { type Page } from "@playwright/test";
import pg from "pg";

export const DEMO_USER = {
  username: "demo_detective",
  password: "detective-demo-2026",
} as const;

let pool: pg.Pool | null = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL required for e2e helpers");
    }
    pool = new pg.Pool({ connectionString });
  }
  return pool;
}

export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  return getPool().query<T>(text, params);
}

export async function loginAs(
  page: Page,
  username = DEMO_USER.username,
  password = DEMO_USER.password,
) {
  await page.goto("/login");
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL(/\/(profile|cases|fictional|admin|pricing|billing)/, {
      timeout: 20_000,
    }),
    page.click('button[type="submit"]'),
  ]);
}
