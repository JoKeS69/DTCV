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
    <div className="flex items-center gap-2">
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
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-dim"
          strokeWidth={1.5}
          aria-hidden
        />
      </label>
      {showFilterIcon ? (
        <button
          type="submit"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[6px] border border-border bg-surface-elevated text-text-muted transition-colors hover:border-border-strong hover:text-text md:size-10"
          aria-label="Apply filters"
        >
          <SlidersHorizontal className="size-4" strokeWidth={1.5} />
        </button>
      ) : null}
    </div>
  );
}
