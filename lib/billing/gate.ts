import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadAccessDecision } from "@/lib/billing/service";
import type { AccessDecision } from "@/lib/billing/access";

export type FictionalGateResult =
  | { ok: true; userId: string; decision: AccessDecision }
  | { ok: false; error: string; code: "unauthenticated" | "forbidden" };

/**
 * Server gate for Fictional cases page + investigation / theory APIs.
 * Frontend redirects are convenience only — this is authoritative.
 */
export async function checkFictionalAccess(): Promise<FictionalGateResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in required", code: "unauthenticated" };
  }
  const decision = await loadAccessDecision(session.user.id);
  if (!decision) {
    return { ok: false, error: "Sign in required", code: "unauthenticated" };
  }
  if (!decision.allowed) {
    return {
      ok: false,
      error: "Fictional cases require a free trial or paid access",
      code: "forbidden",
    };
  }
  return { ok: true, userId: session.user.id, decision };
}

export async function requireFictionalAccessOrRedirect(
  destination = "/fictional",
): Promise<{ userId: string; decision: AccessDecision }> {
  const result = await checkFictionalAccess();
  if (!result.ok) {
    if (result.code === "unauthenticated") {
      redirect(
        `/login?callbackUrl=${encodeURIComponent(destination)}`,
      );
    }
    redirect(
      `/billing/paywall?callbackUrl=${encodeURIComponent(destination)}`,
    );
  }
  return { userId: result.userId, decision: result.decision };
}

export async function requireFictionalAccessAction(): Promise<
  | { ok: true; userId: string; decision: AccessDecision }
  | { ok: false; error: string }
> {
  const result = await checkFictionalAccess();
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return {
    ok: true,
    userId: result.userId,
    decision: result.decision,
  };
}
