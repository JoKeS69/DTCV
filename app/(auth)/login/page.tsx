import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata("Login");

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-[360px] flex-col items-stretch">
      <div className="mb-8 text-center">
        <h1 className="font-mono text-2xl font-semibold tracking-[0.28em] text-text md:text-[1.75rem]">
          CASE//NET
        </h1>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.32em] text-text-muted">
          Global Investigation Platform
        </p>
      </div>
      <LoginForm callbackUrl={params.callbackUrl} />
    </div>
  );
}
