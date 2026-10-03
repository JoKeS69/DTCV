"use client";

import { Suspense } from "react";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { CasenetAtmosphere } from "@/components/layout/CasenetAtmosphere";
import { CommandDeckTopNav } from "@/components/layout/CommandDeckTopNav";
import type { DeckUser } from "@/components/layout/deck-user";

export type { DeckUser };

export function CommandDeckShell({
  children,
  user,
  activeCaseFiles,
}: {
  children: React.ReactNode;
  user: DeckUser;
  activeCaseFiles?: number;
}) {
  const count = activeCaseFiles ?? 0;
  const countLabel =
    count === 0
      ? "NO CASE FILES PUBLISHED"
      : `${count.toLocaleString("en-US")} ACTIVE CASE FILES`;

  return (
    <div className="relative flex h-svh flex-col overflow-hidden bg-transparent">
      <CasenetAtmosphere variant="app" />
      <div className="relative z-10 flex h-full min-h-0 flex-col pointer-events-auto">
        <Suspense
          fallback={
            <div className="h-14 shrink-0 border-b border-border bg-bg/90 md:h-[3.75rem]" />
          }
        >
          <CommandDeckTopNav user={user} />
        </Suspense>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(var(--bottom-nav)+env(safe-area-inset-bottom)+16px)] md:pb-0">
            {children}
          </div>
          <footer className="hidden h-10 shrink-0 items-center justify-between border-t border-border bg-bg/90 px-5 font-mono text-[12px] uppercase tracking-[0.1em] backdrop-blur-sm md:flex xl:px-8">
            <p className="truncate text-online">
              <span className="text-text-dim">&gt; </span>
              SYSTEM MESSAGE: DATABASE CONNECTION SECURE // {countLabel}
            </p>
            <p className="shrink-0 text-text-muted">
              &gt; <span className="motion-cursor-blink">_</span>
            </p>
          </footer>
          <div className="border-t border-border bg-bg/90 px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.08em] text-online backdrop-blur-sm md:hidden">
            <span className="mr-2 inline-block size-2 rounded-full bg-online align-middle motion-pulse-online" />
            DATABASE CONNECTION SECURE // {countLabel}
          </div>
        </div>
        <Suspense fallback={null}>
          <BottomNavigation />
        </Suspense>
      </div>
    </div>
  );
}
