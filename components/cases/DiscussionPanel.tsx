import Link from "next/link";
import type { HudDiscussion } from "@/lib/cases/hud-data";
import { DiscussionItem } from "@/components/ui/DiscussionItem";
import { Panel, PanelHeader } from "@/components/ui/Panel";

export function DiscussionPanel({
  caseCode,
  discussions,
  sheet = false,
}: {
  caseCode: string | null;
  discussions: HudDiscussion[];
  sheet?: boolean;
}) {
  return (
    <Panel className={sheet ? "motion-sheet-in min-h-[70svh]" : "min-h-[240px]"}>
      <PanelHeader
        action={
          caseCode ? (
            <Link
              href={`/cases?select=${caseCode}`}
              className="font-mono text-[12px] uppercase tracking-[0.1em] text-text-muted transition-colors hover:text-text"
            >
              View all →
            </Link>
          ) : null
        }
      >
        &gt; DISCUSSION
        {caseCode ? ` (CASE ${caseCode})` : ""}
      </PanelHeader>
      <ul className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto px-1 py-1 md:px-2">
        {discussions.length === 0 ? (
          <li className="px-4 py-8 font-mono text-[14px] text-text-dim">
            No discussions on this file yet
          </li>
        ) : (
          discussions.map((d) => (
            <li key={d.id}>
              <DiscussionItem item={d} />
            </li>
          ))
        )}
      </ul>
    </Panel>
  );
}
