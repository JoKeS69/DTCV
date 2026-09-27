import { NextResponse } from "next/server";
import { createBooking, isSlotTaken } from "@/lib/fieldwork-store";
import { fieldworkServices, isWeekdayIso, SLOT_HOURS, type SlotHour } from "@/lib/fieldwork";
import { sanitizeText } from "@/lib/sanitize";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be JSON." }, { status: 400 });
  }

  if (!json || typeof json !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
  }

  const body = json as Record<string, unknown>;
  const serviceId = typeof body.serviceId === "string" ? body.serviceId : "";
  const date = typeof body.date === "string" ? body.date : "";
  const time = typeof body.time === "string" ? body.time : "";
  const name = sanitizeText(body.name, 120);
  const emailRaw = typeof body.email === "string" ? body.email.trim().slice(0, 254) : "";
  const notes = sanitizeText(body.notes, 800);

  if (!fieldworkServices.some((s) => s.id === serviceId)) {
    return NextResponse.json({ ok: false, error: "Select a service." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isWeekdayIso(date)) {
    return NextResponse.json({ ok: false, error: "Pick a weekday date." }, { status: 400 });
  }
  if (!SLOT_HOURS.includes(time as SlotHour)) {
    return NextResponse.json({ ok: false, error: "Pick an available time." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ ok: false, error: "Enter your name." }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(emailRaw)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  }

  const service = fieldworkServices.find((s) => s.id === serviceId);
  if (service && isSlotTaken(date, time, service.staff)) {
    return NextResponse.json(
      { ok: false, error: "That slot is already booked for this staff member." },
      { status: 409 },
    );
  }

  const result = createBooking({
    serviceId,
    date,
    time: time as SlotHour,
    name,
    email: emailRaw.toLowerCase(),
    notes,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true, booking: result.booking }, { status: 201 });
}
