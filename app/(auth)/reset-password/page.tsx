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
      <div className="mb-8 text-center">
        <h1 className="font-mono text-2xl font-semibold tracking-[0.28em] text-text">
          CASE//NET
        </h1>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.32em] text-text-muted">
          {token ? "Set new password" : "Password reset"}
        </p>
      </div>
      {token ? <ConfirmResetForm token={token} /> : <RequestResetForm />}
    </div>
  );
}
