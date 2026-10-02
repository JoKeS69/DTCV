import { NextResponse } from "next/server";
import { flagCasesForReverify } from "@/lib/research/trending";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  return (req.headers.get("x-cron-secret") ?? "") === secret;
}

/** Weekly re-verify flag job stub. */
export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await flagCasesForReverify("cron:reverify");
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}

export async function POST(req: Request) {
  return GET(req);
}
