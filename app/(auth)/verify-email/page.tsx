import type { Metadata } from "next";
import Link from "next/link";
import { verifyEmailAction } from "@/app/actions/auth";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata("Verify email");

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await verifyEmailAction(token)
    : { ok: false, error: "Missing verification token" };

  return (
    <div className="w-full max-w-[360px] text-center">
      <h1 className="font-mono text-2xl font-semibold tracking-[0.28em] text-text">
        CASE//NET
      </h1>
      <p className="mt-6 border border-border px-4 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
        {result.ok ? result.message : result.error}
      </p>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
        Email delivery is a Phase 2 placeholder when no provider is configured.
      </p>
      <Link href="/login" className="auth-btn-ghost mt-6 inline-flex w-full">
        LOGIN
      </Link>
    </div>
  );
}
