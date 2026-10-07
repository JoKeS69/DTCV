import { AuthHudChrome } from "@/components/auth/AuthHudChrome";
import { CasenetAtmosphere } from "@/components/layout/CasenetAtmosphere";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-landing relative min-h-svh overflow-hidden bg-[#050505] text-text">
      <CasenetAtmosphere variant="auth" />
      <AuthHudChrome />
      <div className="relative z-10 flex min-h-svh items-center justify-center px-5 py-20 sm:py-24">
        <div className="mx-auto flex w-full max-w-[320px] flex-col items-center sm:max-w-[360px]">
          {children}
        </div>
      </div>
    </div>
  );
}
