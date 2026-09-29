import type { HudActivity } from "@/lib/cases/hud-data";
import { ActivityItem } from "@/components/ui/ActivityItem";
import { Panel, PanelHeader } from "@/components/ui/Panel";

export function RecentActivity({ items }: { items: HudActivity[] }) {
  return (
    <Panel className="min-h-[240px]">
      <PanelHeader>&gt; RECENT ACTIVITY</PanelHeader>
      <ul className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto px-1 py-1 md:px-2">
        {items.map((item) => (
          <li key={item.id}>
            <ActivityItem item={item} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
