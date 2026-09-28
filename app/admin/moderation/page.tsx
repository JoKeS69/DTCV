import type { Metadata } from "next";
import Link from "next/link";
import {
  adminSetDiscussionStatus,
  adminSetReportStatus,
  adminSoftDeleteComment,
} from "@/app/actions/admin";
import { AdminActionButton } from "@/components/admin/AdminActionButtons";
import { AdminShell } from "@/components/admin/AdminShell";
import { getPrisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Moderation" };

export default async function AdminModerationPage() {
  const prisma = getPrisma();
  const [reports, discussions, recentComments] = await Promise.all([
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        reporter: { select: { username: true } },
      },
    }),
    prisma.discussion.findMany({
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        title: true,
        status: true,
        deletedAt: true,
        createdAt: true,
        case: { select: { caseCode: true, slug: true } },
        author: { select: { username: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.comment.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        body: true,
        createdAt: true,
        discussionId: true,
        author: { select: { username: true } },
        discussion: { select: { title: true } },
      },
    }),
  ]);

  const openCount = reports.filter((r) => r.status === "OPEN").length;

  return (
    <AdminShell
      title="Moderation"
      subtitle="Review reports, hide discussions, remove comments. Soft-delete only — no hard purge."
      current="/admin/moderation"
    >
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
        Queue · {openCount} open reports · {discussions.length} recent threads
      </p>

      <section className="border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Reports
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
                  <div className="flex flex-wrap gap-1">
                    {report.status === "OPEN" ? (
                      <AdminActionButton
                        label="Reviewing"
                        onAction={() =>
                          adminSetReportStatus(report.id, "REVIEWING")
                        }
                      />
                    ) : null}
                    {report.status !== "RESOLVED" ? (
                      <AdminActionButton
                        label="Resolve"
                        onAction={() =>
                          adminSetReportStatus(report.id, "RESOLVED")
                        }
                      />
                    ) : null}
                    {report.status !== "DISMISSED" ? (
                      <AdminActionButton
                        label="Dismiss"
                        onAction={() =>
                          adminSetReportStatus(report.id, "DISMISSED")
                        }
                      />
                    ) : null}
                    {report.status !== "OPEN" ? (
                      <AdminActionButton
                        label="Reopen"
                        onAction={() =>
                          adminSetReportStatus(report.id, "OPEN")
                        }
                      />
                    ) : null}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Discussions
        </header>
        <ul className="divide-y divide-border">
          {discussions.length === 0 ? (
            <li className="px-4 py-3 font-mono text-[11px] text-text-dim">
              No discussions.
            </li>
          ) : (
            discussions.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <Link
                    href={`/discussions/${d.id}`}
                    className="font-mono text-[11px] text-text hover:text-cta"
                  >
                    {d.title}
                  </Link>
                  <p className="mt-1 font-mono text-[10px] text-text-dim">
                    <Link
                      href={`/cases/${d.case.slug}`}
                      className="hover:text-text"
                    >
                      {d.case.caseCode}
                    </Link>
                    {" · "}@{d.author.username}
                    {" · "}
                    {d.status}
                    {d.deletedAt ? " · soft-deleted" : ""}
                    {" · "}
                    {d._count.comments} comments
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {d.status !== "OPEN" ? (
                    <AdminActionButton
                      label="Open"
                      onAction={() => adminSetDiscussionStatus(d.id, "OPEN")}
                    />
                  ) : null}
                  {d.status !== "LOCKED" ? (
                    <AdminActionButton
                      label="Lock"
                      onAction={() => adminSetDiscussionStatus(d.id, "LOCKED")}
                    />
                  ) : null}
                  {d.status !== "HIDDEN" ? (
                    <AdminActionButton
                      label="Hide"
                      danger
                      onAction={() => adminSetDiscussionStatus(d.id, "HIDDEN")}
                    />
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Recent comments
        </header>
        <ul className="divide-y divide-border">
          {recentComments.length === 0 ? (
            <li className="px-4 py-3 font-mono text-[11px] text-text-dim">
              No comments.
            </li>
          ) : (
            recentComments.map((comment) => (
              <li
                key={comment.id}
                className="flex flex-wrap items-start justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-[10px] text-text-dim">
                    @{comment.author.username} ·{" "}
                    <Link
                      href={`/discussions/${comment.discussionId}`}
                      className="hover:text-text"
                    >
                      {comment.discussion.title}
                    </Link>
                  </p>
                  <p className="mt-1 max-w-xl font-mono text-[12px] text-text-muted normal-case tracking-normal">
                    {comment.body.slice(0, 220)}
                    {comment.body.length > 220 ? "…" : ""}
                  </p>
                </div>
                <AdminActionButton
                  label="Remove"
                  danger
                  onAction={() => adminSoftDeleteComment(comment.id)}
                />
              </li>
            ))
          )}
        </ul>
      </section>
    </AdminShell>
  );
}
