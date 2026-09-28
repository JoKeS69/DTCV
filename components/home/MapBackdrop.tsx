export function MapBackdrop() {
  return (
    <div
      aria-hidden
      className="hud-map hud-vignette motion-grid-drift absolute inset-0"
    >
      <div className="absolute inset-0 opacity-[0.14]">
        <svg
          viewBox="0 0 1200 700"
          className="h-full w-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-border-strong"
          >
            <path d="M120 220 C180 180 240 170 300 190 C360 210 390 250 420 240 C470 220 520 160 610 170 C700 180 740 230 800 220 C860 210 920 150 1000 170" />
            <path d="M180 300 C240 290 280 320 320 360 C360 400 420 430 500 410 C560 395 600 360 640 370" />
            <path d="M700 300 C760 280 820 300 860 340 C900 380 960 400 1040 380" />
            <path d="M250 480 C320 460 380 500 460 520 C540 540 620 510 700 500" />
            <path d="M820 480 C880 470 940 500 1000 530 C1060 560 1100 540 1140 520" />
          </g>
          <g fill="currentColor" className="text-online">
            <circle cx="320" cy="240" r="2.5" opacity="0.7" />
            <circle cx="540" cy="210" r="2" opacity="0.55" />
            <circle cx="780" cy="250" r="2.5" opacity="0.7" />
            <circle cx="960" cy="190" r="2" opacity="0.5" />
          </g>
          <g fill="currentColor" className="text-amber">
            <circle cx="430" cy="360" r="2" opacity="0.55" />
            <circle cx="880" cy="350" r="2.5" opacity="0.65" />
            <circle cx="600" cy="500" r="2" opacity="0.5" />
          </g>
        </svg>
      </div>

      <div className="pointer-events-none absolute inset-x-6 top-6 hidden justify-between font-mono text-[9px] uppercase tracking-[0.28em] text-text-dim md:flex">
        <span>0.0000° N 0.0000° E</span>
        <span>37.7749° N 122.4194° W</span>
      </div>
    </div>
  );
}
