import Link from "next/link";
import { listPublishedWorldDomination } from "@/lib/pb-case/world-domination";
import { WORLD_DOMINATION_MAX } from "@/lib/pb-case/world-domination";

/**
 * Homepage / deck section: at most 3 World Domination cases.
 * Unpublished stubs do not appear here.
 */
export async function WorldDominationSection() {
  let cases: Awaited<ReturnType<typeof listPublishedWorldDomination>> = [];
  try {
    cases = await listPublishedWorldDomination();
  } catch {
    cases = [];
  }

  return (
    <section className="border border-border bg-surface/20">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text">
          &gt; World Domination
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
          {cases.length}/{WORLD_DOMINATION_MAX} published
        </span>
      </header>
      {cases.length === 0 ? (
        <p className="px-3 py-4 font-mono text-[11px] text-text-dim">
          No published World Domination cases yet. Seed stubs stay unpublished
          until an admin researches, approves claims/people, and publishes.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {cases.slice(0, WORLD_DOMINATION_MAX).map((c) => (
            <li key={c.id}>
              <Link
                href={`/research-cases/${c.slug}`}
                className="block px-3 py-3 hover:bg-surface/40"
              >
                <p className="font-mono text-[13px] text-text">{c.title}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
                  {c.eventDateText ?? "Date TBD"}
                  {c.location ? ` · ${c.location}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
