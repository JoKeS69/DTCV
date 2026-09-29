type Props = {
  q: string;
  type: string;
  status: string;
  country: string;
  year: string;
  sort: string;
  /** Mockup-dense: hide country/year on compact HUD */
  compact?: boolean;
};

export function CaseFilters(props: Props) {
  return (
    <form
      method="get"
      className="flex flex-col gap-1.5 border-b border-border bg-bg p-2 md:flex-row md:flex-wrap md:items-center"
    >
      <label className="relative min-w-[200px] flex-1">
        <span className="sr-only">Search cases</span>
        <input
          name="q"
          defaultValue={props.q}
          id={props.compact ? "case-search" : undefined}
          placeholder="Search by case ID, location, keyword..."
          className="w-full border border-border bg-surface px-3 py-1.5 pr-8 font-mono text-[11px] text-text outline-none placeholder:text-text-dim focus:border-border-strong"
        />
        <span
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim"
          aria-hidden
        >
          ⌕
        </span>
      </label>

      <select
        name="type"
        defaultValue={props.type}
        className="border border-border bg-surface px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
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
        className="border border-border bg-surface px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
      >
        <option value="ALL">All statuses</option>
        <option value="OPEN">Open</option>
        <option value="COLD">Cold</option>
        <option value="UNSOLVED">Unsolved</option>
        <option value="CLOSED">Closed</option>
      </select>

      {!props.compact ? (
        <>
          <input
            name="country"
            defaultValue={props.country}
            placeholder="Country"
            maxLength={2}
            className="w-20 border border-border bg-surface px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text placeholder:text-text-dim"
          />
          <input
            name="year"
            defaultValue={props.year}
            placeholder="Year"
            maxLength={4}
            className="w-20 border border-border bg-surface px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text placeholder:text-text-dim"
          />
        </>
      ) : null}

      <select
        name="sort"
        defaultValue={props.sort}
        className="border border-border bg-surface px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text"
      >
        <option value="updated">Sort: Updated</option>
        <option value="year">Sort: Year</option>
        <option value="code">Sort: Case ID</option>
      </select>

      <button
        type="submit"
        className="border border-border-strong bg-surface-elevated px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:bg-border"
      >
        Apply
      </button>
    </form>
  );
}
