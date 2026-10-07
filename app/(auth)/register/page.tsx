import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privatePageMetadata("Sign up");

export default function RegisterPage() {
  return (
    <div className="auth-identity mx-auto flex w-full flex-col items-center text-center">
      <header className="auth-brand motion-fade-up w-full">
        <h1 className="auth-brand-title font-display">CASE//NET</h1>
        <p className="auth-brand-sub">Global Investigation Platform</p>
        <p className="auth-brand-cue">Create detective identity</p>
      </header>
      <RegisterForm />
    </div>
  );
}
