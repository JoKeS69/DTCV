import Link from "next/link";

export function RenewalBanner({
  daysRemaining,
}: {
  daysRemaining: number;
}) {
  if (daysRemaining > 7 || daysRemaining < 0) return null;
  const label =
    daysRemaining <= 1
      ? "Access ends in about 1 day"
      : `Access ends in about ${daysRemaining} days`;

  return (
    <div className="mb-3 border border-amber/40 bg-amber/10 px-3 py-2 font-mono text-[11px] text-amber">
      {label}.{" "}
      <Link href="/billing/paywall?callbackUrl=/fictional" className="underline text-text">
        Renew
      </Link>{" "}
      with Visa or Whish Money — one click from Billing.
    </div>
  );
}
