import Link from "next/link";
import { Card } from "@/components/ui/Card";

const features = [
  {
    index: "01",
    title: "Real cases",
    body: "Sourced unsolved investigations with citations, verified labels, and no guilt declarations — evidence first.",
    href: "/cases",
    meta: "Open · Cold · Unsolved",
  },
  {
    index: "02",
    title: "Fictional ops",
    body: "Structured training cases where you gather evidence, form theories, and earn progression without harming real people.",
    href: "/fictional",
    meta: "XP · Challenges · Ranks",
  },
  {
    index: "03",
    title: "Community intel",
    body: "Discuss theories, share findings, and build case boards with other detectives — moderated for serious inquiry.",
    href: "/cases",
    meta: "Forum · Boards · Signals",
  },
] as const;

export function FeaturedSections() {
  return (
    <section
      id="featured"
      className="border-t border-border bg-bg scroll-mt-20"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-dim">
              &gt; Featured systems
            </p>
            <h2 className="mt-3 font-mono text-2xl font-semibold uppercase tracking-[0.08em] text-text md:text-3xl">
              Three ways in
            </h2>
          </div>
          <p className="max-w-md font-sans text-sm text-text-muted md:text-right">
            Public surfaces for exploration. Auth, live case data, and tools
            arrive in later phases.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <Link key={feature.index} href={feature.href} className="group block">
              <Card className="h-full transition-transform duration-300 group-hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-[10px] tracking-[0.22em] text-text-dim">
                    {feature.index}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-online">
                    {feature.meta}
                  </span>
                </div>
                <h3 className="mt-4 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-text">
                  {feature.title}
                </h3>
                <p className="mt-3 font-sans text-sm leading-relaxed text-text-muted">
                  {feature.body}
                </p>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim transition-colors group-hover:text-text">
                  View pathway →
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
