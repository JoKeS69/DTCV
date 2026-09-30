import { NextResponse } from "next/server";
import { syncAllSources } from "@/lib/sync/run";
import type { CaseDataSource } from "@/lib/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** FBI full pagination can exceed default serverless limits on large catalogs. */
export const maxDuration = 300;

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  const header = req.headers.get("x-cron-secret") ?? "";
  return header === secret;
}

/**
 * Hourly case sync. Protect with CRON_SECRET (Authorization: Bearer …).
 * Vercel Cron: see vercel.json crons entry.
 */
export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const sourceParam = url.searchParams.get("source");
  const sources = sourceParam
    ? ([sourceParam] as CaseDataSource[])
    : undefined;

  const results = await syncAllSources({ force, sources });
  const failed = results.some((r) => r.status === "FAILED");
  return NextResponse.json(
    {
      ok: !failed,
      results,
      at: new Date().toISOString(),
    },
    { status: failed ? 207 : 200 },
  );
}

export async function POST(req: Request) {
  return GET(req);
}
