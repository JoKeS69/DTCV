"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  COMMUNITY_LIMITS,
  rateLimit,
  userRateKey,
} from "@/lib/rate-limit";
import { forceUserTheoryLabel } from "@/lib/community/queries";
import { getPrisma } from "@/lib/db";
import { requireActiveUser } from "@/lib/server/authz";
import type {
  ContentLabel,
  DiscussionStatus,
  ReportTargetType,
} from "@/lib/generated/prisma/client";

export type CommunityActionResult =
  | { ok: true; id?: string; followed?: boolean; liked?: boolean }
  | { ok: false; error: string };

async function requireUser() {
  const gate = await requireActiveUser();
  if (!gate.ok) {
    return { ok: false as const, error: gate.error, user: null };
  }
  return {
    ok: true as const,
    user: {
      id: gate.user.id,
      username: gate.user.username,
    },
  };
}

async function requireStaff() {
  const gate = await requireUser();
  if (!gate.ok || !gate.user) return gate;
  const dbUser = await getPrisma().user.findUnique({
    where: { id: gate.user.id },
    select: { role: true, suspendedAt: true },
  });
  if (!dbUser || dbUser.suspendedAt) {
    return { ok: false as const, error: "Sign in required", user: null };
  }
  if (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR") {
    return { ok: false as const, error: "Moderator access required", user: null };
  }
  return gate;
}

function revalidateCommunity(caseSlug?: string | null, discussionId?: string) {
  if (caseSlug) revalidatePath(`/cases/${caseSlug}`);
  if (discussionId) revalidatePath(`/discussions/${discussionId}`);
  revalidatePath("/cases");
}

const discussionSchema = z.object({
  caseId: z.string().min(1),
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(8000),
  contentLabel: z.enum(["USER_THEORY", "REPORTED"]).default("USER_THEORY"),
});

const commentSchema = z.object({
  discussionId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
  parentId: z.string().optional().nullable(),
  contentLabel: z.enum(["USER_THEORY", "REPORTED"]).default("USER_THEORY"),
});

const reportSchema = z.object({
  targetType: z.enum(["COMMENT", "DISCUSSION", "USER", "CASE"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(3).max(200),
  details: z.string().trim().max(2000).optional().nullable(),
});

export async function createDiscussion(input: {
  caseId: string;
  title: string;
  body: string;
  contentLabel?: "USER_THEORY" | "REPORTED";
}): Promise<CommunityActionResult> {
  const gate = await requireUser();
  if (!gate.ok || !gate.user) return { ok: false, error: gate.error };

  const parsed = discussionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid discussion (title 3–160, body 10–8000 chars)" };
  }

  const limited = rateLimit(
    userRateKey("discussion", gate.user.id),
    COMMUNITY_LIMITS.discussion,
  );
  if (!limited.ok) {
    return { ok: false, error: `Slow down — retry in ${limited.retryAfterSec}s` };
  }

  const caseFile = await getPrisma().case.findFirst({
    where: { id: parsed.data.caseId, published: true },
    select: { id: true, slug: true },
  });
  if (!caseFile) return { ok: false, error: "Case not found" };

  const label = forceUserTheoryLabel(parsed.data.contentLabel as ContentLabel);

  const discussion = await getPrisma().discussion.create({
    data: {
      caseId: caseFile.id,
      authorId: gate.user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      contentLabel: label,
      status: "OPEN",
    },
    select: { id: true },
  });

  revalidateCommunity(caseFile.slug, discussion.id);
  return { ok: true, id: discussion.id };
}

export async function createComment(input: {
  discussionId: string;
  body: string;
  parentId?: string | null;
  contentLabel?: "USER_THEORY" | "REPORTED";
}): Promise<CommunityActionResult> {
  const gate = await requireUser();
  if (!gate.ok || !gate.user) return { ok: false, error: gate.error };

  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid comment (1–4000 chars)" };
  }

  const limited = rateLimit(
    userRateKey("comment", gate.user.id),
    COMMUNITY_LIMITS.comment,
  );
  if (!limited.ok) {
    return { ok: false, error: `Slow down — retry in ${limited.retryAfterSec}s` };
  }

  const discussion = await getPrisma().discussion.findFirst({
    where: {
      id: parsed.data.discussionId,
      deletedAt: null,
      status: { not: "HIDDEN" },
    },
    select: {
      id: true,
      status: true,
      case: { select: { slug: true } },
    },
  });
  if (!discussion) return { ok: false, error: "Discussion not found" };
  if (discussion.status === "LOCKED") {
    return { ok: false, error: "Discussion is locked" };
  }

  if (parsed.data.parentId) {
    const parent = await getPrisma().comment.findFirst({
      where: {
        id: parsed.data.parentId,
        discussionId: discussion.id,
        deletedAt: null,
      },
      select: { id: true, parentId: true },
    });
    if (!parent) return { ok: false, error: "Parent comment not found" };
    // One-level replies only
    if (parent.parentId) {
      return { ok: false, error: "Replies to replies are not allowed" };
    }
  }

  const label = forceUserTheoryLabel(parsed.data.contentLabel as ContentLabel);

  const comment = await getPrisma().comment.create({
    data: {
      discussionId: discussion.id,
      authorId: gate.user.id,
      parentId: parsed.data.parentId ?? null,
      body: parsed.data.body,
      contentLabel: label,
    },
    select: { id: true },
  });

  await getPrisma().discussion.update({
    where: { id: discussion.id },
    data: { updatedAt: new Date() },
  });

  revalidateCommunity(discussion.case.slug, discussion.id);
  return { ok: true, id: comment.id };
}

export async function toggleCommentLike(
  commentId: string,
): Promise<CommunityActionResult> {
  const gate = await requireUser();
  if (!gate.ok || !gate.user) return { ok: false, error: gate.error };

  const limited = rateLimit(
    userRateKey("reaction", gate.user.id),
    COMMUNITY_LIMITS.reaction,
  );
  if (!limited.ok) {
    return { ok: false, error: `Slow down — retry in ${limited.retryAfterSec}s` };
  }

  const comment = await getPrisma().comment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: {
      id: true,
      discussionId: true,
      discussion: {
        select: {
          deletedAt: true,
          status: true,
          case: { select: { slug: true } },
        },
      },
    },
  });
  if (!comment || comment.discussion.deletedAt || comment.discussion.status === "HIDDEN") {
    return { ok: false, error: "Comment not found" };
  }

  const existing = await getPrisma().commentReaction.findUnique({
    where: {
      commentId_userId_type: {
        commentId,
        userId: gate.user.id,
        type: "LIKE",
      },
    },
  });

  if (existing) {
    await getPrisma().commentReaction.delete({ where: { id: existing.id } });
  } else {
    await getPrisma().commentReaction.create({
      data: { commentId, userId: gate.user.id, type: "LIKE" },
    });
  }

  revalidateCommunity(comment.discussion.case.slug, comment.discussionId);
  return { ok: true, liked: !existing };
}

export async function toggleFollowDiscussion(
  discussionId: string,
): Promise<CommunityActionResult> {
  const gate = await requireUser();
  if (!gate.ok || !gate.user) return { ok: false, error: gate.error };

  const discussion = await getPrisma().discussion.findFirst({
    where: { id: discussionId, deletedAt: null, status: { not: "HIDDEN" } },
    select: { id: true, case: { select: { slug: true } } },
  });
  if (!discussion) return { ok: false, error: "Discussion not found" };

  const existing = await getPrisma().followedDiscussion.findUnique({
    where: {
      userId_discussionId: { userId: gate.user.id, discussionId },
    },
  });

  if (existing) {
    await getPrisma().followedDiscussion.delete({ where: { id: existing.id } });
  } else {
    await getPrisma().followedDiscussion.create({
      data: { userId: gate.user.id, discussionId },
    });
  }

  revalidateCommunity(discussion.case.slug, discussionId);
  return { ok: true, followed: !existing };
}

export async function createReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string | null;
}): Promise<CommunityActionResult> {
  const gate = await requireUser();
  if (!gate.ok || !gate.user) return { ok: false, error: gate.error };

  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid report (reason required)" };
  }

  const limited = rateLimit(
    userRateKey("report", gate.user.id),
    COMMUNITY_LIMITS.report,
  );
  if (!limited.ok) {
    return { ok: false, error: `Slow down — retry in ${limited.retryAfterSec}s` };
  }

  // Verify target exists (prevents orphan / oracle spam reports).
  if (parsed.data.targetType === "DISCUSSION") {
    const d = await getPrisma().discussion.findUnique({
      where: { id: parsed.data.targetId },
      select: { id: true },
    });
    if (!d) return { ok: false, error: "Discussion not found" };
  } else if (parsed.data.targetType === "COMMENT") {
    const c = await getPrisma().comment.findUnique({
      where: { id: parsed.data.targetId },
      select: { id: true },
    });
    if (!c) return { ok: false, error: "Comment not found" };
  } else if (parsed.data.targetType === "USER") {
    const u = await getPrisma().user.findUnique({
      where: { id: parsed.data.targetId },
      select: { id: true },
    });
    if (!u) return { ok: false, error: "User not found" };
  } else if (parsed.data.targetType === "CASE") {
    const c = await getPrisma().case.findFirst({
      where: { id: parsed.data.targetId, published: true },
      select: { id: true },
    });
    if (!c) return { ok: false, error: "Case not found" };
  }

  const report = await getPrisma().report.create({
    data: {
      reporterId: gate.user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
      status: "OPEN",
    },
    select: { id: true },
  });

  return { ok: true, id: report.id };
}

export async function softDeleteDiscussion(
  discussionId: string,
): Promise<CommunityActionResult> {
  const gate = await requireUser();
  if (!gate.ok || !gate.user) return { ok: false, error: gate.error };

  const discussion = await getPrisma().discussion.findUnique({
    where: { id: discussionId },
    select: {
      id: true,
      authorId: true,
      case: { select: { slug: true } },
    },
  });
  if (!discussion) return { ok: false, error: "Discussion not found" };

  const dbUser = await getPrisma().user.findUnique({
    where: { id: gate.user.id },
    select: { role: true },
  });
  const isStaff = dbUser?.role === "ADMIN" || dbUser?.role === "MODERATOR";
  if (discussion.authorId !== gate.user.id && !isStaff) {
    return { ok: false, error: "Not allowed" };
  }

  await getPrisma().discussion.update({
    where: { id: discussionId },
    data: { deletedAt: new Date(), status: "HIDDEN" },
  });

  revalidateCommunity(discussion.case.slug, discussionId);
  return { ok: true };
}

export async function softDeleteComment(
  commentId: string,
): Promise<CommunityActionResult> {
  const gate = await requireUser();
  if (!gate.ok || !gate.user) return { ok: false, error: gate.error };

  const comment = await getPrisma().comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      discussionId: true,
      discussion: { select: { case: { select: { slug: true } } } },
    },
  });
  if (!comment) return { ok: false, error: "Comment not found" };

  const dbUser = await getPrisma().user.findUnique({
    where: { id: gate.user.id },
    select: { role: true },
  });
  const isStaff = dbUser?.role === "ADMIN" || dbUser?.role === "MODERATOR";
  if (comment.authorId !== gate.user.id && !isStaff) {
    return { ok: false, error: "Not allowed" };
  }

  await getPrisma().comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
  });

  revalidateCommunity(comment.discussion.case.slug, comment.discussionId);
  return { ok: true };
}

export async function setDiscussionStatus(
  discussionId: string,
  status: DiscussionStatus,
): Promise<CommunityActionResult> {
  const gate = await requireStaff();
  if (!gate.ok || !gate.user) return { ok: false, error: gate.error };

  if (!["OPEN", "LOCKED", "HIDDEN"].includes(status)) {
    return { ok: false, error: "Invalid status" };
  }

  const discussion = await getPrisma().discussion.findUnique({
    where: { id: discussionId },
    select: { id: true, case: { select: { slug: true } } },
  });
  if (!discussion) return { ok: false, error: "Discussion not found" };

  await getPrisma().discussion.update({
    where: { id: discussionId },
    data: {
      status,
      deletedAt: status === "HIDDEN" ? new Date() : null,
    },
  });

  revalidateCommunity(discussion.case.slug, discussionId);
  revalidatePath("/admin/moderation");
  return { ok: true };
}

export async function setReportStatus(
  reportId: string,
  status: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED",
): Promise<CommunityActionResult> {
  const gate = await requireStaff();
  if (!gate.ok || !gate.user) return { ok: false, error: gate.error };

  await getPrisma().report.update({
    where: { id: reportId },
    data: {
      status,
      resolvedAt:
        status === "RESOLVED" || status === "DISMISSED" ? new Date() : null,
    },
  });

  revalidatePath("/admin/moderation");
  return { ok: true };
}
