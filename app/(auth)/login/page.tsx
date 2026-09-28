import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="font-mono text-2xl font-semibold tracking-[0.28em] text-text md:text-[1.75rem]">
          DETECTIVE
        </h1>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.32em] text-text-muted">
          Global Investigation Platform
        </p>
      </div>
      <LoginForm callbackUrl={params.callbackUrl} />
    </div>
  );
}
