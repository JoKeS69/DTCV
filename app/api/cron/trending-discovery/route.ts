import { NextResponse } from "next/server";
import { runTrendingDiscovery } from "@/lib/research/trending";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  return (req.headers.get("x-cron-secret") ?? "") === secret;
}

/** Trending cron stub — LLM/search runs on python research-worker, not Next.js. */
export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runTrendingDiscovery("cron:trending");
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}

export async function POST(req: Request) {
  return GET(req);
}
