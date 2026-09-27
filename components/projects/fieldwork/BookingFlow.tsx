"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fieldworkServices,
  isWeekdayIso,
  SLOT_HOURS,
  type SlotHour,
} from "@/lib/fieldwork";

type Availability = { taken: string[] };
type Confirm = { id: string; date: string; time: string; service: string; staff: string };

function localIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function upcomingWeekdays(count: number): string[] {
  const out: string[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (out.length < count) {
    const iso = localIso(cursor);
    if (isWeekdayIso(iso)) out.push(iso);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function parseTaken(keys: string[]): Set<string> {
  return new Set(keys);
}

export function BookingFlow() {
  const days = useMemo(() => upcomingWeekdays(10), []);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [serviceId, setServiceId] = useState(fieldworkServices[0]?.id ?? "site-audit");
  const [date, setDate] = useState(days[0] ?? "");
  const [time, setTime] = useState<SlotHour | "">("");
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const service = fieldworkServices.find((s) => s.id === serviceId) ?? fieldworkServices[0];

  const refresh = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const res = await fetch("/api/fieldwork/availability");
      const json = (await res.json()) as Availability;
      if (!res.ok) throw new Error("bad");
      setTaken(parseTaken(json.taken ?? []));
    } catch {
      setLoadError("Could not load availability. Refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const staff = service?.staff ?? "";

  function slotTaken(t: string) {
    return taken.has(`${date}|${t}|${staff}`);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    setConfirm(null);
    if (!time) {
      setFormError("Pick an open time slot.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const notes = String(fd.get("notes") ?? "").trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Enter your name and a valid email.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/fieldwork/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, date, time, name, email, notes }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        booking?: { id: string; date: string; time: string; serviceId: string };
      };
      if (!res.ok || !json.ok || !json.booking) {
        setFormError(json.error || "Could not book that slot.");
        if (res.status === 409) await refresh();
        return;
      }
      setConfirm({
        id: json.booking.id,
        date: json.booking.date,
        time: json.booking.time,
        service: service?.name ?? "",
        staff,
      });
      setTime("");
      await refresh();
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="field-wrap wrap">
      <header className="marlow-hero">
        <p className="proj-tag">Service booking</p>
        <h1>Fieldwork</h1>
        <p>Weekday slots only. The same staff member cannot be double-booked.</p>
      </header>
      {loadError ? <div className="form-error" role="alert">{loadError}</div> : null}
      {confirm ? (
        <div className="success-box show" role="status">
          Booked {confirm.service} with {confirm.staff} on {confirm.date} at {confirm.time} (ref {confirm.id}).
          A confirmation would go to the address you entered.
        </div>
      ) : null}
      <form className="field-grid" onSubmit={onSubmit}>
        <div>
          <label htmlFor="svc">Service</label>
          <select
            id="svc"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setTime("");
            }}
          >
            {fieldworkServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.durationMin} min · {s.staff}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="cal-label">Date</p>
          <div className="cal-grid">
            {days.map((iso) => (
              <button
                key={iso}
                type="button"
                className={iso === date ? "cal-day on" : "cal-day"}
                onClick={() => {
                  setDate(iso);
                  setTime("");
                }}
              >
                {iso.slice(5)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="cal-label">Time · {staff}</p>
          {loading ? <p className="demo-muted">Checking calendars…</p> : null}
          <div className="slot-grid">
            {SLOT_HOURS.map((t) => {
              const busy = slotTaken(t);
              return (
                <button
                  key={t}
                  type="button"
                  disabled={busy || loading}
                  className={time === t ? "slot on" : "slot"}
                  onClick={() => setTime(t)}
                >
                  {t}
                  {busy ? " · taken" : ""}
                </button>
              );
            })}
          </div>
        </div>
        <div className="contact-form">
          <div>
            <label htmlFor="bk-name">Name</label>
            <input id="bk-name" name="name" required />
          </div>
          <div>
            <label htmlFor="bk-email">Email</label>
            <input id="bk-email" name="email" type="email" required />
          </div>
          <div>
            <label htmlFor="bk-notes">Notes (optional)</label>
            <textarea id="bk-notes" name="notes" />
          </div>
          {formError ? <div className="form-error" role="alert">{formError}</div> : null}
          <button type="submit" className="submit-btn" disabled={sending || !time}>
            {sending ? "Booking…" : "Request appointment"}
          </button>
        </div>
      </form>
    </div>
  );
}
