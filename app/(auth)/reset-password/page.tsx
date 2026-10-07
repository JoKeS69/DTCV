import type { Metadata } from "next";
import {
  ConfirmResetForm,
  RequestResetForm,
} from "@/components/auth/ResetPasswordForm";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata("Reset password");

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="w-full">
      <header className="auth-brand motion-fade-up">
        <h1 className="auth-brand-title font-display">CASE//NET</h1>
        <p className="auth-brand-sub">Global Investigation Platform</p>
        <p className="auth-brand-cue">
          {token ? "Set new password" : "Password reset"}
        </p>
      </header>
      {token ? <ConfirmResetForm token={token} /> : <RequestResetForm />}
    </div>
  );
}
