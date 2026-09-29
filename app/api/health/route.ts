import { NextResponse } from "next/server";

/**
 * Lightweight liveness probe. Does not touch the database so builds and
 * cold starts succeed before DATABASE_URL is configured.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "detective",
    phase: 14,
  });
}
