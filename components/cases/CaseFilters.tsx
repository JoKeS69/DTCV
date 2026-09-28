import Link from "next/link";

type Props = {
  q: string;
  type: string;
  status: string;
  country: string;
  year: string;
  sort: string;
};

export function CaseFilters(props: Props) {
  return (
    <form
      method="get"
      className="flex flex-col gap-2 border border-border bg-surface/80 p-2 md:flex-row md:flex-wrap md:items-center"
    >
      <label className="relative min-w-[220px] flex-1">
        <span className="sr-only">Search cases</span>
        <input
          name="q"
          defaultValue={props.q}
          placeholder="Search by case ID, location, keyword..."
          className="w-full border border-border bg-bg px-3 py-2 pr-9 font-mono text-xs text-text outline-none placeholder:text-text-dim focus:border-border-strong"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-dim" aria-hidden>
          ⌕
        </span>
      </label>

      <select
        name="type"
        defaultValue={props.type}
        className="border border-border bg-bg px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
      >
        <option value="ALL">All types</option>
        <option value="DISAPPEARANCE">Disappearance</option>
        <option value="HOMICIDE">Homicide</option>
        <option value="MISSING">Missing</option>
        <option value="UNKNOWN">Unknown</option>
        <option value="OTHER">Other</option>
      </select>

      <select
        name="status"
        defaultValue={props.status}
        className="border border-border bg-bg px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
      >
        <option value="ALL">All statuses</option>
        <option value="OPEN">Open</option>
        <option value="COLD">Cold</option>
        <option value="UNSOLVED">Unsolved</option>
        <option value="CLOSED">Closed</option>
      </select>

      <input
        name="country"
        defaultValue={props.country}
        placeholder="Country"
        maxLength={2}
        className="w-20 border border-border bg-bg px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text placeholder:text-text-dim"
      />

      <input
        name="year"
        defaultValue={props.year}
        placeholder="Year"
        inputMode="numeric"
        maxLength={4}
        className="w-20 border border-border bg-bg px-2 py-2 font-mono text-[10px] tracking-[0.12em] text-text placeholder:text-text-dim"
      />

      <select
        name="sort"
        defaultValue={props.sort}
        className="border border-border bg-bg px-2 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
      >
        <option value="updated">Sort: Updated</option>
        <option value="year">Sort: Year</option>
        <option value="code">Sort: Case ID</option>
      </select>

      <button
        type="submit"
        className="border border-cta bg-cta px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-cta-text"
      >
        Apply
      </button>

      <Link
        href="/cases"
        className="border border-border px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted hover:text-text"
      >
        Reset
      </Link>
    </form>
  );
}
