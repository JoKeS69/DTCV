/**
 * CASE//NET atmospheric backdrop — grid drift, floating map, soft scan.
 * Performant CSS/SVG only. Respects prefers-reduced-motion via CSS.
 */
export function CasenetAtmosphere({
  variant = "app",
}: {
  /** app = subtle behind panels; auth = fuller landing field */
  variant?: "app" | "auth";
}) {
  const local = variant === "auth";

  return (
    <div
      aria-hidden
      className={[
        "casenet-atmosphere pointer-events-none",
        local ? "casenet-atmosphere--local casenet-atmosphere--auth" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="casenet-atmosphere__grid pointer-events-none" />

      <svg
        className="casenet-atmosphere__map pointer-events-none"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <g
          className="casenet-atmosphere__map-drift"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <path d="M80 260C180 200 280 190 380 220C480 250 560 210 680 230C820 255 940 200 1080 230C1180 250 1280 220 1380 250" />
          <path d="M120 360C220 340 300 390 400 420C520 460 640 430 760 450C900 475 1040 430 1200 460" />
          <path d="M200 520C320 500 420 560 560 580C700 600 840 560 980 590C1120 620 1240 580 1360 600" />
          <path d="M60 620C160 640 260 700 400 720C560 745 720 700 880 730C1040 760 1200 720 1380 750" />
          <path d="M700 180C760 160 820 175 860 200C900 230 940 210 980 190" />
        </g>
        <g
          className="casenet-atmosphere__map-labels"
          fill="currentColor"
          fontFamily="var(--font-mono), monospace"
          fontSize="11"
          letterSpacing="0.2em"
        >
          <text x="220" y="280">
            NORTH AMERICA
          </text>
          <text x="320" y="520">
            SOUTH AMERICA
          </text>
          <text x="700" y="250">
            EUROPE
          </text>
          <text x="740" y="420">
            AFRICA
          </text>
          <text x="1040" y="300">
            ASIA
          </text>
          <text x="1120" y="620">
            AUSTRALIA
          </text>
        </g>
        {/* Soft ping nodes — static positions; pulse via CSS opacity on group */}
        <g className="casenet-atmosphere__nodes" fill="currentColor">
          <circle cx="320" cy="300" r="2.5" />
          <circle cx="780" cy="280" r="2" />
          <circle cx="1100" cy="340" r="2.5" />
          <circle cx="480" cy="540" r="2" />
          <circle cx="960" cy="500" r="2" />
        </g>
      </svg>

      <div className="casenet-atmosphere__scan pointer-events-none" />
      <div className="casenet-atmosphere__vignette pointer-events-none" />

      {local ? (
        <>
          <span className="hud-corner hud-corner-tl pointer-events-none" />
          <span className="hud-corner hud-corner-tr pointer-events-none" />
          <span className="hud-corner hud-corner-bl pointer-events-none" />
          <span className="hud-corner hud-corner-br pointer-events-none" />
        </>
      ) : null}
    </div>
  );
}
