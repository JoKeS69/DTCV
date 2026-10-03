import { CommandDeckServer } from "@/components/layout/CommandDeckServer";
import { requireFictionalAccessOrRedirect } from "@/lib/billing/gate";
import { RenewalBanner } from "@/components/billing/RenewalBanner";
import { daysUntilAccessEnd } from "@/lib/billing/access";

export default async function FictionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { decision } = await requireFictionalAccessOrRedirect("/fictional");
  const days = daysUntilAccessEnd(decision);

  return (
    <CommandDeckServer>
      {days != null && days <= 7 ? (
        <div className="deck-page pb-0">
          <RenewalBanner daysRemaining={days} />
        </div>
      ) : null}
      {children}
    </CommandDeckServer>
  );
}
