import { AuthHudChrome } from "@/components/auth/AuthHudChrome";
import { HudMapBackground } from "@/components/auth/HudMapBackground";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh overflow-hidden bg-[#050505] text-text">
      <HudMapBackground />
      <AuthHudChrome />
      <div className="relative z-10 flex min-h-svh items-center justify-center px-4 py-24">
        <div className="flex w-full max-w-[360px] flex-col items-stretch">
          {children}
        </div>
      </div>
    </div>
  );
}
