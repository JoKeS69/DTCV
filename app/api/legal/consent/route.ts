import { NextResponse } from "next/server";
import {
  hashIpOptional,
  newVisitorKey,
  recordConsent,
} from "@/lib/legal/consent";
import {
  CONSENT_COOKIE,
  LEGAL_POLICY_VERSION,
  VISITOR_COOKIE,
} from "@/lib/legal/policy";
import { networkRateKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rl = rateLimit(networkRateKey("consent", ip), {
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    agree?: boolean;
  } | null;
  if (!body?.agree) {
    return NextResponse.json({ error: "agree_required" }, { status: 400 });
  }

  const cookieHeader = req.headers.get("cookie") ?? "";
  const existingVisitor = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${VISITOR_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const visitorKey = existingVisitor
    ? decodeURIComponent(existingVisitor)
    : newVisitorKey();

  await recordConsent({
    visitorKey,
    ipHash: hashIpOptional(ip),
    userAgent: req.headers.get("user-agent"),
  });

  const res = NextResponse.json({
    ok: true,
    policyVersion: LEGAL_POLICY_VERSION,
  });
  res.cookies.set(CONSENT_COOKIE, LEGAL_POLICY_VERSION, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  res.cookies.set(VISITOR_COOKIE, visitorKey, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
