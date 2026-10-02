import { NextResponse } from "next/server";
import { getCasesPrisma } from "@/lib/cases-db";
import { hashContact } from "@/lib/legal/consent";
import { writeAuditLog } from "@/lib/pb-case/audit";
import { networkRateKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(networkRateKey("takedown", ip), {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    reason?: string;
    contact?: string;
    url?: string;
    caseId?: string;
    caseSlug?: string;
  } | null;

  const reason = body?.reason?.trim() ?? "";
  if (reason.length < 10) {
    return NextResponse.json({ error: "reason_required" }, { status: 400 });
  }

  const db = getCasesPrisma();
  let caseId = body?.caseId ?? null;
  if (!caseId && body?.caseSlug) {
    const row = await db.caseFile.findUnique({
      where: { slug: body.caseSlug },
      select: { id: true },
    });
    caseId = row?.id ?? null;
  }

  const created = await db.takedownRequest.create({
    data: {
      caseId,
      reason: reason.slice(0, 2000),
      url: body?.url?.slice(0, 500) || null,
      contactHash: body?.contact ? hashContact(body.contact) : null,
      status: "open",
    },
  });

  await writeAuditLog({
    actor: "public",
    action: "takedown.request",
    entityType: "takedown_request",
    entityId: created.id,
    meta: { caseId },
  });

  return NextResponse.json({ ok: true, id: created.id });
}
