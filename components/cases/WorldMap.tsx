/** Dark SVG world map with subtle status markers — not Google Maps. */

const MARKERS: { cx: number; cy: number; status: "OPEN" | "COLD" | "UNSOLVED" | "CLOSED" }[] = [
  { cx: 160, cy: 118, status: "OPEN" }, // USA east
  { cx: 95, cy: 110, status: "COLD" }, // USA west
  { cx: 210, cy: 95, status: "OPEN" }, // UK
  { cx: 230, cy: 115, status: "COLD" }, // France
  { cx: 245, cy: 105, status: "CLOSED" }, // Germany
  { cx: 380, cy: 120, status: "OPEN" }, // Japan
  { cx: 255, cy: 135, status: "UNSOLVED" }, // Italy
  { cx: 130, cy: 150, status: "UNSOLVED" }, // Brazil-ish
  { cx: 120, cy: 90, status: "COLD" }, // Canada
  { cx: 300, cy: 160, status: "OPEN" }, // India-ish
  { cx: 350, cy: 180, status: "COLD" }, // Australia-ish north
];

const COLOR: Record<string, string> = {
  OPEN: "#4ade80",
  COLD: "#f5a524",
  UNSOLVED: "#7d8fa3",
  CLOSED: "#c4c8cc",
};

export function WorldMap({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-full min-h-[120px] w-full overflow-hidden bg-[#050505] ${className}`}>
      <svg
        viewBox="0 0 480 240"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <pattern id="mapDots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="#1a2228" />
          </pattern>
          <radialGradient id="mapGlow" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#10161c" />
            <stop offset="100%" stopColor="#050505" />
          </radialGradient>
        </defs>
        <rect width="480" height="240" fill="url(#mapGlow)" />
        <rect width="480" height="240" fill="url(#mapDots)" opacity="0.85" />

        {/* Simplified continents — muted outlines */}
        <g fill="none" stroke="#2a333b" strokeWidth="1">
          {/* N America */}
          <path d="M40 70 C70 50 110 55 140 70 C165 85 175 105 160 130 C140 155 100 160 70 145 C45 130 30 100 40 70Z" />
          {/* S America */}
          <path d="M145 155 C160 150 175 165 170 190 C165 215 150 225 140 210 C130 190 132 165 145 155Z" />
          {/* Europe */}
          <path d="M210 75 C230 70 255 78 260 95 C250 110 230 112 215 105 C205 95 202 82 210 75Z" />
          {/* Africa */}
          <path d="M220 115 C250 110 270 130 265 165 C255 195 230 200 215 180 C205 155 208 125 220 115Z" />
          {/* Asia */}
          <path d="M265 70 C320 55 380 65 400 95 C390 130 340 145 300 135 C270 125 255 95 265 70Z" />
          {/* Australia */}
          <path d="M360 170 C395 165 415 180 405 200 C385 212 355 205 350 185 C352 175 355 172 360 170Z" />
        </g>
        <g fill="#151c22" stroke="#243038" strokeWidth="0.6" opacity="0.9">
          <path d="M40 70 C70 50 110 55 140 70 C165 85 175 105 160 130 C140 155 100 160 70 145 C45 130 30 100 40 70Z" />
          <path d="M145 155 C160 150 175 165 170 190 C165 215 150 225 140 210 C130 190 132 165 145 155Z" />
          <path d="M210 75 C230 70 255 78 260 95 C250 110 230 112 215 105 C205 95 202 82 210 75Z" />
          <path d="M220 115 C250 110 270 130 265 165 C255 195 230 200 215 180 C205 155 208 125 220 115Z" />
          <path d="M265 70 C320 55 380 65 400 95 C390 130 340 145 300 135 C270 125 255 95 265 70Z" />
          <path d="M360 170 C395 165 415 180 405 200 C385 212 355 205 350 185 C352 175 355 172 360 170Z" />
        </g>

        {MARKERS.map((m, i) => (
          <g key={i}>
            <circle cx={m.cx} cy={m.cy} r="3.2" fill={COLOR[m.status]} opacity="0.25" />
            <circle cx={m.cx} cy={m.cy} r="1.6" fill={COLOR[m.status]} />
          </g>
        ))}
      </svg>
    </div>
  );
}
