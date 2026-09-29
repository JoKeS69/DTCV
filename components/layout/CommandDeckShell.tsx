"use client";

import { Suspense, useState } from "react";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { CommandDeckHeader } from "@/components/layout/CommandDeckHeader";
import {
  CommandDeckSidebar,
  type DeckUser,
} from "@/components/layout/CommandDeckSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { HUD_STATS } from "@/lib/cases/hud-data";

export function CommandDeckShell({
  children,
  user,
  activeCaseFiles,
}: {
  children: React.ReactNode;
  user: DeckUser;
  activeCaseFiles?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const count = activeCaseFiles ?? HUD_STATS.total;
  const countLabel = `${count.toLocaleString("en-US")} ACTIVE CASE FILES`;

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-bg">
      <CommandDeckHeader />
      <MobileHeader
        menuOpen={menuOpen}
        onMenu={() => setMenuOpen((v) => !v)}
      />
      <div className="relative flex min-h-0 flex-1">
        <CommandDeckSidebar
          user={user}
          mobileOpen={menuOpen}
          onNavigate={() => setMenuOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto pb-[4.5rem] md:pb-0">
            {children}
          </div>
          <footer className="hidden shrink-0 items-center justify-between border-t border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] md:flex">
            <p className="text-online">
              <span className="text-text-dim">&gt; </span>
              SYSTEM MESSAGE: DATABASE CONNECTION SECURE // {countLabel}
            </p>
            <p className="text-text-muted">
              &gt; <span className="motion-cursor-blink">_</span>
            </p>
          </footer>
          <div className="border-t border-border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-online md:hidden">
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-online align-middle motion-pulse-online" />
            DATABASE CONNECTION SECURE // {countLabel}
          </div>
        </div>
      </div>
      <Suspense fallback={null}>
        <BottomNavigation />
      </Suspense>
    </div>
  );
}
