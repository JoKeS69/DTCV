import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvestigationGame } from "@/components/investigation/InvestigationGame";
import { FictionalBanner } from "@/components/fictional/FictionalBanner";
import { getInvestigationPlayPayload } from "@/lib/investigation/queries";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildPageMetadata({
    title: `Investigate · ${slug}`,
    description: "Fictional Investigation Mode — invented whodunit training case.",
    path: `/fictional/investigate/${slug}`,
  });
}

export const dynamic = "force-dynamic";

export default async function InvestigateCasePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const payload = await getInvestigationPlayPayload(slug);
  if (!payload) notFound();

  return (
    <main className="deck-page">
      <div className="mb-3">
        <FictionalBanner />
      </div>
      <InvestigationGame
        slug={payload.case.slug}
        caseData={payload.case}
        player={payload.player}
        llmOfflineHint={payload.llmOfflineHint}
      />
    </main>
  );
}
