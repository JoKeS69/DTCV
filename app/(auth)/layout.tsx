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
      <div className="relative z-10 flex min-h-svh items-center justify-center px-4 py-20">
        <div className="flex w-full max-w-[280px] flex-col items-stretch sm:max-w-[300px]">
          {children}
        </div>
      </div>
    </div>
  );
}
