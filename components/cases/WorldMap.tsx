"use client";

import dynamic from "next/dynamic";
import type { HudMapMarker } from "@/lib/cases/hud-types";

const WorldMapClient = dynamic(
  () =>
    import("@/components/cases/WorldMapClient").then((m) => m.WorldMapClient),
  {
    ssr: false,
    loading: () => (
      <div
        className="relative h-full min-h-[120px] w-full overflow-hidden bg-[#050505]"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#10161c_0%,#050505_70%)]" />
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "radial-gradient(circle, #1a2228 0.6px, transparent 0.7px)",
            backgroundSize: "6px 6px",
          }}
        />
      </div>
    ),
  },
);

export function WorldMap({
  markers = [],
  className = "",
}: {
  markers?: HudMapMarker[];
  className?: string;
}) {
  return <WorldMapClient markers={markers} className={className} />;
}
