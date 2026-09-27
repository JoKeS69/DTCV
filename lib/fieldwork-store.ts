import { bookingKey, fieldworkServices, isWeekdayIso, type BookingRecord, type SlotHour } from "@/lib/fieldwork";

/**
 * Process-local booking store for the Fieldwork demo.
 * Seeded conflicts prove the lock works; new bookings persist until the
 * serverless instance recycles (fine for a live prototype).
 */
const bookings = new Map<string, BookingRecord>();

function seed() {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  let date = "";
  for (let i = 0; i < 14; i += 1) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    const iso = `${y}-${m}-${d}`;
    if (isWeekdayIso(iso)) {
      date = iso;
      break;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (!date) return;
  const staff = fieldworkServices[0]?.staff ?? "Maya Chen";
  const rec: BookingRecord = {
    id: "seed_1",
    serviceId: "site-audit",
    date,
    time: "10:30",
    name: "Existing client",
    email: "held@example.com",
    notes: "Seeded hold so double-booking can be demonstrated.",
  };
  bookings.set(bookingKey(date, rec.time, staff), rec);
}

seed();

export function listTakenKeys(): string[] {
  return [...bookings.keys()];
}

export function isSlotTaken(date: string, time: string, staff: string): boolean {
  return bookings.has(bookingKey(date, time, staff));
}

export function createBooking(input: {
  serviceId: string;
  date: string;
  time: SlotHour;
  name: string;
  email: string;
  notes: string;
}): { ok: true; booking: BookingRecord } | { ok: false; error: string } {
  const service = fieldworkServices.find((s) => s.id === input.serviceId);
  if (!service) return { ok: false, error: "Unknown service." };

  const key = bookingKey(input.date, input.time, service.staff);
  if (bookings.has(key)) {
    return { ok: false, error: "That slot is already booked for this staff member." };
  }

  const booking: BookingRecord = {
    id: `bk_${Date.now().toString(36)}`,
    serviceId: input.serviceId,
    date: input.date,
    time: input.time,
    name: input.name,
    email: input.email,
    notes: input.notes,
  };
  bookings.set(key, booking);
  return { ok: true, booking };
}
