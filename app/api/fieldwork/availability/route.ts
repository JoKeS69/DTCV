import { NextResponse } from "next/server";
import { listTakenKeys } from "@/lib/fieldwork-store";
import { fieldworkServices, SLOT_HOURS } from "@/lib/fieldwork";

export async function GET() {
  return NextResponse.json({
    taken: listTakenKeys(),
    services: fieldworkServices,
    slots: SLOT_HOURS,
  });
}
