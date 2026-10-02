"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { resolveTakedownAction } from "@/app/actions/pb-case";

export function TakedownActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1">
      {(["reviewing", "resolved", "rejected"] as const).map((s) => (
        <button
          key={s}
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await resolveTakedownAction(id, s);
              router.refresh();
            })
          }
          className="border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
