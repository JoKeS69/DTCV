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
      className="flex flex-col gap-1.5 border-b border-border p-2 md:flex-row md:flex-wrap md:items-center"
      onChange={(e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === "SELECT") {
          formRef.current?.requestSubmit();
        }
      }}
    >
      {select ? <input type="hidden" name="select" value={select} /> : null}
      {focus ? <input type="hidden" name="focus" value={focus} /> : null}
      <div className="min-w-0 flex-1 md:min-w-[220px]">
        <SearchBar q={q} showFilterIcon id="case-search" />
      </div>
      <FilterControls type={type} status={status} sort={sort} />
      <button type="submit" className="sr-only">
        Apply filters
      </button>
    </form>
  );
}
