export function HudMapBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="auth-map-grid absolute inset-0" />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.22]"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="none" stroke="#3a3f48" strokeWidth="1">
          <path d="M80 260C180 200 280 190 380 220C480 250 560 210 680 230C820 255 940 200 1080 230C1180 250 1280 220 1380 250" />
          <path d="M120 360C220 340 300 390 400 420C520 460 640 430 760 450C900 475 1040 430 1200 460" />
          <path d="M200 520C320 500 420 560 560 580C700 600 840 560 980 590C1120 620 1240 580 1360 600" />
          <path d="M60 620C160 640 260 700 400 720C560 745 720 700 880 730C1040 760 1200 720 1380 750" />
        </g>
        <g fill="#6b7280" fontFamily="var(--font-mono), monospace" fontSize="11" letterSpacing="0.2em">
          <text x="220" y="280" opacity="0.45">NORTH AMERICA</text>
          <text x="320" y="520" opacity="0.4">SOUTH AMERICA</text>
          <text x="700" y="250" opacity="0.45">EUROPE</text>
          <text x="740" y="420" opacity="0.4">AFRICA</text>
          <text x="1040" y="300" opacity="0.45">ASIA</text>
          <text x="1120" y="620" opacity="0.4">AUSTRALIA</text>
        </g>
      </svg>
      <div className="auth-vignette absolute inset-0" />
      {/* Corner brackets */}
      <span className="hud-corner hud-corner-tl" />
      <span className="hud-corner hud-corner-tr" />
      <span className="hud-corner hud-corner-bl" />
      <span className="hud-corner hud-corner-br" />
    </div>
  );
}
