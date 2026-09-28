import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  setDiscussionStatus,
  setReportStatus,
} from "@/app/actions/community";
import { getPrisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Moderation",
};

export default async function ModerationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/moderation");

  const user = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN" && user?.role !== "MODERATOR") {
    redirect("/cases");
  }

  const [reports, hiddenDiscussions] = await Promise.all([
    getPrisma().report.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        reporter: { select: { username: true } },
      },
    }),
    getPrisma().discussion.findMany({
      where: { OR: [{ status: "HIDDEN" }, { deletedAt: { not: null } }] },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        status: true,
        deletedAt: true,
        case: { select: { caseCode: true, slug: true } },
      },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 md:px-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        Phase 9 placeholder · staff only
      </p>
      <h1 className="mt-2 font-mono text-2xl font-semibold uppercase tracking-[0.1em] text-text">
        Moderation
      </h1>
      <p className="mt-2 font-mono text-[11px] text-text-muted normal-case tracking-normal">
        Minimal queue for reports and discussion status. Full admin console is
        Phase 9.
      </p>

      <section className="mt-6 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Open reports
        </header>
        <ul className="divide-y divide-border">
          {reports.length === 0 ? (
            <li className="px-4 py-3 font-mono text-[11px] text-text-dim">
              No reports filed.
            </li>
          ) : (
            reports.map((report) => (
              <li key={report.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text">
                      {report.targetType} · {report.status}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-text-dim">
                      by @{report.reporter.username} · target {report.targetId}
                    </p>
                    <p className="mt-1 font-mono text-[12px] text-text-muted normal-case tracking-normal">
                      {report.reason}
                      {report.details ? ` — ${report.details}` : ""}
                    </p>
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await setReportStatus(report.id, "RESOLVED");
                    }}
                  >
                    <button
                      type="submit"
                      className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-text"
                    >
                      Resolve
                    </button>
                  </form>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Hidden / soft-deleted discussions
        </header>
        <ul className="divide-y divide-border">
          {hiddenDiscussions.length === 0 ? (
            <li className="px-4 py-3 font-mono text-[11px] text-text-dim">
              None.
            </li>
          ) : (
            hiddenDiscussions.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-[11px] text-text">{d.title}</p>
                  <p className="mt-1 font-mono text-[10px] text-text-dim">
                    <Link href={`/cases/${d.case.slug}`} className="hover:text-text">
                      {d.case.caseCode}
                    </Link>
                    {" · "}
                    {d.status}
                  </p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await setDiscussionStatus(d.id, "OPEN");
                  }}
                >
                  <button
                    type="submit"
                    className="border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-text"
                  >
                    Restore OPEN
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
