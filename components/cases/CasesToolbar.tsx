"use client";

import { useRef } from "react";
import { FilterControls } from "@/components/cases/FilterControls";
import { SearchBar } from "@/components/cases/SearchBar";

export function CasesToolbar({
  q,
  type,
  status,
  sort,
  select,
  focus,
}: {
  q: string;
  type: string;
  status: string;
  sort: string;
  select?: string;
  focus?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      method="get"
      className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:flex-wrap md:items-center md:gap-3 md:p-5 xl:p-6"
      onChange={(e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === "SELECT") {
          formRef.current?.requestSubmit();
        }
      }}
    >
      {select ? <input type="hidden" name="select" value={select} /> : null}
      {focus ? <input type="hidden" name="focus" value={focus} /> : null}
      <div className="min-w-0 flex-1 md:min-w-[240px]">
        <SearchBar q={q} showFilterIcon id="case-search" />
      </div>
      {/* Chip-style scroll row on mobile; even-height selects on desktop */}
      <div className="-mx-1 overflow-x-auto px-1 md:mx-0 md:overflow-visible md:px-0">
        <FilterControls type={type} status={status} sort={sort} />
      </div>
      <button type="submit" className="sr-only">
        Apply filters
      </button>
    </form>
  );
}
