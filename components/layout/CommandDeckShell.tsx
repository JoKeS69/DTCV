"use client";

import { useState } from "react";
import { CommandDeckHeader } from "@/components/layout/CommandDeckHeader";
import {
  CommandDeckSidebar,
  type DeckUser,
} from "@/components/layout/CommandDeckSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

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
  const countLabel =
    typeof activeCaseFiles === "number"
      ? `${activeCaseFiles.toLocaleString("en-US")} ACTIVE CASE FILES`
      : "SYSTEM ONLINE";

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-bg">
      <CommandDeckHeader
        menuOpen={menuOpen}
        onMenu={() => setMenuOpen((v) => !v)}
      />
      <div className="relative flex min-h-0 flex-1">
        <CommandDeckSidebar
          user={user}
          mobileOpen={menuOpen}
          onNavigate={() => setMenuOpen(false)}
        />
        {menuOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            aria-label="Close menu overlay"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto pb-16 md:pb-0">
            {children}
          </div>
          <footer className="hidden shrink-0 items-center justify-between border-t border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim md:flex">
            <p className="text-online">
              <span className="mr-2 inline-block size-1.5 rounded-full bg-online align-middle motion-pulse-online" />
              SYSTEM MESSAGE: DATABASE CONNECTION SECURE // {countLabel}
            </p>
            <p className="text-text-muted">_</p>
          </footer>
          <div className="border-t border-border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-online md:hidden">
            <span className="mr-2 inline-block size-1.5 rounded-full bg-online align-middle motion-pulse-online" />
            DATABASE CONNECTION SECURE // {countLabel}
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
