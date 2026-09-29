import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata("Sign up");

export default function RegisterPage() {
  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="font-mono text-2xl font-semibold tracking-[0.28em] text-text md:text-[1.75rem]">
          DETECTIVE
        </h1>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.32em] text-text-muted">
          Global Investigation Platform
        </p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          Create detective identity
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
