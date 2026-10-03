"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { upsertCase } from "@/app/actions/admin";
import type {
  CasePriority,
  CaseStatus,
  CaseType,
  ContentLabel,
} from "@/lib/generated/prisma/client";

type CaseValues = {
  id?: string;
  caseCode: string;
  title: string;
  slug: string;
  summary: string;
  publicNotes: string;
  location: string;
  countryCode: string;
  latitude: string;
  longitude: string;
  year: string;
  type: CaseType;
  status: CaseStatus;
  priority: CasePriority;
  contentLabel: ContentLabel;
  isDevStub: boolean;
};

export function CaseAdminForm({ initial }: { initial?: Partial<CaseValues> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<CaseValues>(() => ({
    id: initial?.id,
    caseCode: initial?.caseCode ?? `MAN-${Date.now().toString(36).toUpperCase()}`,
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    summary: initial?.summary ?? "",
    publicNotes: initial?.publicNotes ?? "",
    location: initial?.location ?? "",
    countryCode: initial?.countryCode ?? "",
    latitude: initial?.latitude ?? "",
    longitude: initial?.longitude ?? "",
    year: initial?.year ?? "",
    type: initial?.type ?? "UNKNOWN",
    status: initial?.status ?? "OPEN",
    priority: initial?.priority ?? "MEDIUM",
    contentLabel: initial?.contentLabel ?? "REPORTED",
    isDevStub: initial?.isDevStub ?? true,
  }));

  function set<K extends keyof CaseValues>(key: K, value: CaseValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  return (
    <form
      className="space-y-3 border border-border bg-surface/40 px-4 py-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await upsertCase({
            id: values.id,
            caseCode: values.caseCode,
            title: values.title,
            slug: values.slug || undefined,
            summary: values.summary,
            publicNotes: values.publicNotes || null,
            location: values.location || null,
            countryCode: values.countryCode || null,
            latitude: values.latitude.trim() ? Number(values.latitude) : null,
            longitude: values.longitude.trim()
              ? Number(values.longitude)
              : null,
            year: values.year ? Number(values.year) : null,
            type: values.type,
            status: values.status,
            priority: values.priority,
            contentLabel: values.contentLabel,
            isDevStub: values.isDevStub,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setError(null);
          router.push(`/admin/cases/${result.id}`);
          router.refresh();
        });
      }}
    >
      <Field label="Title">
        <input type="hidden" value={values.caseCode} readOnly />
        <input
          className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </Field>
      <Field label="Slug (optional)">
        <input
          className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
          value={values.slug}
          onChange={(e) => set("slug", e.target.value)}
        />
      </Field>
      <Field label="Summary">
        <textarea
          className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
          rows={4}
          value={values.summary}
          onChange={(e) => set("summary", e.target.value)}
          required
        />
      </Field>
      <Field label="Public notes">
        <textarea
          className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
          rows={3}
          value={values.publicNotes}
          onChange={(e) => set("publicNotes", e.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Location">
          <input
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={values.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </Field>
        <Field label="Country code">
          <input
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={values.countryCode}
            onChange={(e) => set("countryCode", e.target.value)}
          />
        </Field>
        <Field label="Latitude (optional)">
          <input
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={values.latitude}
            onChange={(e) => set("latitude", e.target.value)}
            inputMode="decimal"
            placeholder="-90 to 90"
            aria-label="Latitude"
          />
        </Field>
        <Field label="Longitude (optional)">
          <input
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={values.longitude}
            onChange={(e) => set("longitude", e.target.value)}
            inputMode="decimal"
            placeholder="-180 to 180"
            aria-label="Longitude"
          />
        </Field>
        <Field label="Year">
          <input
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={values.year}
            onChange={(e) => set("year", e.target.value)}
          />
        </Field>
        <Field label="Type">
          <select
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={values.type}
            onChange={(e) => set("type", e.target.value as CaseType)}
          >
            {["DISAPPEARANCE", "HOMICIDE", "ASSASSINATION", "MISSING", "WANTED", "UNIDENTIFIED", "KIDNAPPING", "SEEKING_INFORMATION", "TERRORIST", "UNKNOWN", "OTHER"].map(
              (t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ),
            )}
          </select>
        </Field>
        <Field label="Status">
          <select
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={values.status}
            onChange={(e) => set("status", e.target.value as CaseStatus)}
          >
            {["OPEN", "COLD", "UNSOLVED", "CLOSED"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={values.priority}
            onChange={(e) => set("priority", e.target.value as CasePriority)}
          >
            {["LOW", "MEDIUM", "HIGH"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Content label">
          <select
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-[12px] text-text"
            value={values.contentLabel}
            onChange={(e) =>
              set("contentLabel", e.target.value as ContentLabel)
            }
          >
            {["VERIFIED", "REPORTED", "USER_THEORY"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
        <input
          type="checkbox"
          checked={values.isDevStub}
          onChange={(e) => set("isDevStub", e.target.checked)}
        />
        Dev stub (not a real crime claim)
      </label>
      {error ? (
        <p className="font-mono text-[10px] text-danger">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="border border-cta/50 bg-cta/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text disabled:opacity-50"
      >
        {pending ? "Saving…" : values.id ? "Save case" : "Create case"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
      {label}
      {children}
    </label>
  );
}
