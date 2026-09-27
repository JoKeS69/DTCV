export type FieldworkService = {
  id: string;
  name: string;
  durationMin: number;
  staff: string;
};

export const fieldworkServices: FieldworkService[] = [
  { id: "site-audit", name: "On-site audit", durationMin: 60, staff: "Maya Chen" },
  { id: "install", name: "Equipment install", durationMin: 90, staff: "Jonah Reed" },
  { id: "follow-up", name: "Follow-up visit", durationMin: 45, staff: "Maya Chen" },
];

export const SLOT_HOURS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"] as const;
export type SlotHour = (typeof SLOT_HOURS)[number];

export type BookingRecord = {
  id: string;
  serviceId: string;
  date: string;
  time: SlotHour;
  name: string;
  email: string;
  notes: string;
};

export function bookingKey(date: string, time: string, staff: string): string {
  return `${date}|${time}|${staff}`;
}

export function isWeekdayIso(isoDate: string): boolean {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  return day !== 0 && day !== 6;
}
