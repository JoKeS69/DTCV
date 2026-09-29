"use client";

import { Suspense } from "react";
import { BottomNavigation } from "@/components/layout/BottomNavigation";

/** @deprecated Prefer BottomNavigation — kept for AppShell compat */
export function MobileBottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavigation />
    </Suspense>
  );
}
