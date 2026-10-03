import { ImageResponse } from "next/og";

export const alt = "CASE//NET — Global investigation platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Twitter/X card — mirrors default OG art. */
export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#050607",
          color: "#e8eaed",
          padding: 64,
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 6,
            color: "#5a6170",
            textTransform: "uppercase",
          }}
        >
          {"> GLOBAL INVESTIGATION PLATFORM"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: 12,
            }}
          >
            CASE//NET
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#8b929e",
              maxWidth: 800,
            }}
          >
            Case files · community · fictional training
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 18,
            color: "#22c55e",
            letterSpacing: 3,
          }}
        >
          SYSTEM ONLINE
        </div>
      </div>
    ),
    { ...size },
  );
}
