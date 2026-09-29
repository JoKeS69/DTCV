import { Search, SlidersHorizontal } from "lucide-react";

export function SearchBar({
  q,
  showFilterIcon = false,
  id,
}: {
  q: string;
  showFilterIcon?: boolean;
  id?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search cases</span>
        <input
          name="q"
          id={id}
          defaultValue={q}
          placeholder="Search by case ID, location, keyword..."
          className="hud-input"
        />
        <Search
          className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-text-dim"
          strokeWidth={1.25}
          aria-hidden
        />
      </label>
      {showFilterIcon ? (
        <button
          type="submit"
          className="inline-flex size-[30px] shrink-0 items-center justify-center border border-border text-text-dim hover:border-border-strong hover:text-text"
          aria-label="Apply filters"
        >
          <SlidersHorizontal className="size-3.5" strokeWidth={1.25} />
        </button>
      ) : null}
    </div>
  );
}
