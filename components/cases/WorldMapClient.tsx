"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HudCaseStatus, HudMapMarker } from "@/lib/cases/hud-types";

const STATUS_COLOR: Record<HudCaseStatus, string> = {
  OPEN: "#4ade80",
  COLD: "#f5a524",
  UNSOLVED: "#7d8fa3",
  CLOSED: "#c4c8cc",
};

const DARK_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";

function MapResizeGuard() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(el);
    map.invalidateSize({ animate: false });
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function FitMarkers({ markers }: { markers: HudMapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) {
      map.setView([20, 0], 2, { animate: false });
      return;
    }
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 4, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(
      markers.map((m) => [m.lat, m.lng] as [number, number]),
    );
    map.fitBounds(bounds.pad(0.35), { animate: false, maxZoom: 5 });
  }, [map, markers]);
  return null;
}

export function WorldMapClient({
  markers,
  className = "",
}: {
  markers: HudMapMarker[];
  className?: string;
}) {
  const safeMarkers = useMemo(
    () =>
      markers.filter(
        (m) =>
          Number.isFinite(m.lat) &&
          Number.isFinite(m.lng) &&
          m.lat >= -90 &&
          m.lat <= 90 &&
          m.lng >= -180 &&
          m.lng <= 180,
      ),
    [markers],
  );

  return (
    <div
      className={`relative h-full min-h-[120px] w-full overflow-hidden bg-[#050505] ${className}`}
      role="region"
      aria-label="Global cases map"
    >
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={1}
        maxZoom={8}
        scrollWheelZoom={false}
        worldCopyJump
        className="casenet-world-map absolute inset-0 z-0 h-full w-full bg-[#050505]"
        attributionControl={false}
        zoomControl
      >
        <TileLayer attribution="" url={DARK_TILES} />

        <MapResizeGuard />
        <FitMarkers markers={safeMarkers} />
        {safeMarkers.map((m) => {
          const color = STATUS_COLOR[m.status] ?? STATUS_COLOR.UNSOLVED;
          const label = `${m.caseCode}: ${m.title} (${m.status})`;
          return (
            <CircleMarker
              key={m.id}
              center={[m.lat, m.lng]}
              radius={7}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.85,
                weight: 1.5,
                opacity: 0.95,
              }}
              eventHandlers={{
                keydown: (e) => {
                  const ke = e.originalEvent;
                  if (ke.key === "Enter" || ke.key === " ") {
                    ke.preventDefault();
                    (e.target as L.CircleMarker).openTooltip();
                  }
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <span className="font-mono text-[11px] uppercase tracking-[0.06em]">
                  {label}
                </span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {safeMarkers.length === 0 ? (
        <p className="pointer-events-none absolute inset-x-4 top-1/2 z-[500] -translate-y-1/2 text-center font-mono text-[12px] uppercase tracking-[0.1em] text-text-dim">
          No geolocated cases yet
        </p>
      ) : null}

      <p className="pointer-events-none absolute right-2 top-2 z-[450] max-w-[55%] text-right font-mono text-[9px] uppercase leading-snug tracking-[0.08em] text-text-dim/70">
        <Link href="/sources" className="pointer-events-auto text-text-dim/80 hover:text-text-muted">
          Map © Esri · Leaflet
        </Link>
      </p>

      {/* Visually hidden keyboard list for markers (CircleMarkers are pointer-first) */}
      {safeMarkers.length > 0 ? (
        <ul className="sr-only">
          {safeMarkers.map((m) => (
            <li key={`a11y-${m.id}`}>
              {m.caseCode}: {m.title}, status {m.status}, coordinates {m.lat},{" "}
              {m.lng}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
