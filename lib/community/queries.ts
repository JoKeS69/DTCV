import type { ContentLabel, DiscussionStatus } from "@/lib/generated/prisma/client";
import { getPrisma } from "@/lib/db";

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  detectiveRank: true,
  detectiveXP: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
} as const;

export async function listDiscussionsForCase(caseId: string) {
  return getPrisma().discussion.findMany({
    where: {
      caseId,
      deletedAt: null,
      status: { not: "HIDDEN" },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      contentLabel: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { username: true, displayName: true, detectiveRank: true } },
      _count: {
        select: {
          comments: { where: { deletedAt: null } },
          followers: true,
        },
      },
    },
  });
}

export async function getDiscussionById(id: string) {
  return getPrisma().discussion.findFirst({
    where: {
      id,
      deletedAt: null,
      status: { not: "HIDDEN" },
    },
    include: {
      author: { select: authorSelect },
      case: {
        select: {
          id: true,
          caseCode: true,
          title: true,
          slug: true,
          published: true,
        },
      },
      _count: { select: { followers: true } },
    },
  });
}

export async function listCommentsForDiscussion(discussionId: string) {
  return getPrisma().comment.findMany({
    where: {
      discussionId,
      deletedAt: null,
      parentId: null,
    },
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: { username: true, displayName: true, detectiveRank: true },
      },
      reactions: { select: { userId: true, type: true } },
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: { username: true, displayName: true, detectiveRank: true },
          },
          reactions: { select: { userId: true, type: true } },
        },
      },
    },
  });
}

export async function isFollowingDiscussion(
  userId: string | undefined,
  discussionId: string,
) {
  if (!userId) return false;
  const row = await getPrisma().followedDiscussion.findUnique({
    where: { userId_discussionId: { userId, discussionId } },
    select: { id: true },
  });
  return !!row;
}

export async function getPublicDetectiveProfile(username: string) {
  return getPrisma().user.findUnique({
    where: { username },
    select: {
      ...authorSelect,
      _count: {
        select: {
          discussions: { where: { deletedAt: null, status: { not: "HIDDEN" } } },
          comments: { where: { deletedAt: null } },
        },
      },
      discussions: {
        where: { deletedAt: null, status: { not: "HIDDEN" } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          contentLabel: true,
          createdAt: true,
          case: { select: { caseCode: true, slug: true, title: true } },
          _count: { select: { comments: { where: { deletedAt: null } } } },
        },
      },
    },
  });
}

export function discussionVisible(
  status: DiscussionStatus,
  deletedAt: Date | null,
): boolean {
  return deletedAt === null && status !== "HIDDEN";
}

export function forceUserTheoryLabel(label: ContentLabel | undefined): ContentLabel {
  // Users may not mark content VERIFIED. Theories stay USER_THEORY.
  if (label === "REPORTED") return "REPORTED";
  return "USER_THEORY";
}
