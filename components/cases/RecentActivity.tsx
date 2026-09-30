import type { HudActivity } from "@/lib/cases/hud-types";
import { ActivityItem } from "@/components/ui/ActivityItem";
import { Panel, PanelHeader } from "@/components/ui/Panel";

export function RecentActivity({ items }: { items: HudActivity[] }) {
  return (
    <Panel className="min-h-0 max-h-[280px] xl:max-h-[260px]">
      <PanelHeader className="!py-2 text-[11px]">&gt; RECENT ACTIVITY</PanelHeader>
      <ul className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto px-1 py-1 md:px-2">
        {items.length === 0 ? (
          <li className="px-4 py-8 font-mono text-[14px] text-text-dim">
            No recent activity yet
          </li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <ActivityItem item={item} />
            </li>
          ))
        )}
      </ul>
    </Panel>
  );
}
