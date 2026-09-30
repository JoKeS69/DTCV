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
    <div className="w-full">
      <header className="auth-brand">
        <h1 className="auth-brand-title">CASE//NET</h1>
        <p className="auth-brand-sub">Global Investigation Platform</p>
      </header>
      <LoginForm callbackUrl={params.callbackUrl} />
    </div>
  );
}
