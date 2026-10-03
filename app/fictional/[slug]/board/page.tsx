import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { InvestigationBoard } from "@/components/board/InvestigationBoard";
import { FictionalBanner } from "@/components/fictional/FictionalBanner";
import { getBoardState } from "@/lib/board/queries";
import {
  getFictionalCaseBySlug,
  getUserInvestigation,
} from "@/lib/fictional/queries";
import {
  fictionalRequiresPremium,
  getUserEntitlements,
} from "@/lib/payments/entitlements";
import { privatePageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const caseFile = await getFictionalCaseBySlug(slug);
  if (!caseFile) return privatePageMetadata("Board not found");
  return privatePageMetadata(`Board · ${caseFile.title}`);
}

export default async function FictionalBoardPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/fictional/${slug}/board`)}`);
  }

  const caseFile = await getFictionalCaseBySlug(slug);
  if (!caseFile) notFound();

  if (fictionalRequiresPremium(caseFile.difficulty)) {
    const entitlements = await getUserEntitlements(session.user.id);
    if (!entitlements?.isPremium) {
      redirect(`/fictional/${slug}`);
    }
  }

  const investigation = await getUserInvestigation(session.user.id, caseFile.id);
  if (!investigation) {
    redirect(`/fictional/${slug}`);
  }

  const board = await getBoardState(investigation.id, session.user.id);
  if (!board) notFound();

  return (
    <main className="deck-page deck-page--wide">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        <Link href={`/fictional/${slug}`} className="hover:text-text">
          ← {caseFile.title}
        </Link>
        {" · "}
        <Link href="/fictional" className="hover:text-text">
          Training bay
        </Link>
      </p>

      <header className="mt-3 mb-3 flex flex-wrap items-end justify-between gap-3 border border-border bg-surface/60 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] text-text-dim">
            BOARD
          </p>
          <h1 className="mt-1 font-mono text-lg font-semibold uppercase tracking-[0.08em] text-text md:text-xl">
            {caseFile.title}
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
            Status: {board.status}
          </p>
        </div>
        <FictionalBanner compact />
      </header>

      <InvestigationBoard
        key={`${board.nodes.map((n) => n.id).join(",")}|${board.connections.map((c) => c.id).join(",")}`}
        investigationId={board.investigationId}
        locked={board.locked}
        catalog={board.catalog}
        initialNodes={board.nodes}
        initialConnections={board.connections}
      />
    </main>
  );
}
