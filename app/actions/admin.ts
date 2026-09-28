"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/db";
import type {
  CasePriority,
  CaseStatus,
  CaseType,
  ContentLabel,
  DiscussionStatus,
  FictionalDifficulty,
  ReportStatus,
} from "@/lib/generated/prisma/client";

export type AdminActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function revalidateAdmin(...extra: string[]) {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/cases");
  revalidatePath("/admin/fictional");
  revalidatePath("/admin/sources");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/cases");
  revalidatePath("/fictional");
  for (const path of extra) revalidatePath(path);
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function setUserSuspended(
  userId: string,
  suspend: boolean,
): Promise<AdminActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };
  if (userId === gate.admin.id) {
    return { ok: false, error: "Cannot suspend your own admin account" };
  }

  const target = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target) return { ok: false, error: "User not found" };
  if (target.role === "ADMIN" && suspend) {
    return { ok: false, error: "Cannot suspend another admin" };
  }

  await getPrisma().user.update({
    where: { id: userId },
    data: { suspendedAt: suspend ? new Date() : null },
  });
  revalidateAdmin();
  return { ok: true };
}

export async function setUserRole(
  userId: string,
  role: "USER" | "MODERATOR" | "ADMIN",
): Promise<AdminActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };
  if (userId === gate.admin.id && role !== "ADMIN") {
    return { ok: false, error: "Cannot demote yourself" };
  }

  await getPrisma().user.update({
    where: { id: userId },
    data: { role },
  });
  revalidateAdmin();
  return { ok: true };
}

// ─── Real cases ──────────────────────────────────────────────────────────────

const caseSchema = z.object({
  caseCode: z.string().trim().min(2).max(32),
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().min(3).max(80).optional(),
  summary: z.string().trim().min(10).max(8000),
  publicNotes: z.string().trim().max(8000).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  countryCode: z.string().trim().max(8).optional().nullable(),
  year: z.coerce.number().int().min(1800).max(2100).optional().nullable(),
  type: z.enum([
    "DISAPPEARANCE",
    "HOMICIDE",
    "MISSING",
    "UNKNOWN",
    "OTHER",
  ]),
  status: z.enum(["OPEN", "COLD", "UNSOLVED", "CLOSED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  contentLabel: z.enum(["VERIFIED", "REPORTED", "USER_THEORY"]),
  isDevStub: z.boolean().optional(),
});

export async function upsertCase(input: {
  id?: string;
  caseCode: string;
  title: string;
  slug?: string;
  summary: string;
  publicNotes?: string | null;
  location?: string | null;
  countryCode?: string | null;
  year?: number | null;
  type: CaseType;
  status: CaseStatus;
  priority: CasePriority;
  contentLabel: ContentLabel;
  isDevStub?: boolean;
}): Promise<AdminActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = caseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid case" };
  }

  const slug = parsed.data.slug?.trim() || slugify(parsed.data.title);
  const data = {
    caseCode: parsed.data.caseCode.toUpperCase(),
    title: parsed.data.title,
    slug,
    summary: parsed.data.summary,
    publicNotes: parsed.data.publicNotes || null,
    location: parsed.data.location || null,
    countryCode: parsed.data.countryCode?.toUpperCase() || null,
    year: parsed.data.year ?? null,
    type: parsed.data.type,
    status: parsed.data.status,
    priority: parsed.data.priority,
    contentLabel: parsed.data.contentLabel,
    isDevStub: parsed.data.isDevStub ?? true,
  };

  try {
    if (input.id) {
      await getPrisma().case.update({ where: { id: input.id }, data });
      revalidateAdmin(`/cases/${slug}`, `/admin/cases/${input.id}`);
      return { ok: true, id: input.id };
    }
    const created = await getPrisma().case.create({
      data: { ...data, published: false },
      select: { id: true },
    });
    revalidateAdmin(`/admin/cases/${created.id}`);
    return { ok: true, id: created.id };
  } catch {
    return { ok: false, error: "Case code or slug already exists" };
  }
}

export async function setCasePublished(
  caseId: string,
  published: boolean,
): Promise<AdminActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };

  const row = await getPrisma().case.update({
    where: { id: caseId },
    data: {
      published,
      publishedAt: published ? new Date() : null,
    },
    select: { slug: true },
  });
  revalidateAdmin(`/cases/${row.slug}`);
  return { ok: true };
}

export async function setCaseFeatured(
  caseId: string,
  featured: boolean,
): Promise<AdminActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };

  const row = await getPrisma().case.update({
    where: { id: caseId },
    data: { featured },
    select: { slug: true },
  });
  revalidateAdmin(`/cases/${row.slug}`);
  return { ok: true };
}

// ─── Sources ─────────────────────────────────────────────────────────────────

export async function upsertCaseSource(input: {
  id?: string;
  caseId: string;
  title: string;
  url: string;
  publisher?: string | null;
  citationNote?: string | null;
}): Promise<AdminActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };

  const title = input.title.trim();
  const url = input.url.trim();
  if (title.length < 2 || url.length < 5) {
    return { ok: false, error: "Title and URL required" };
  }

  const caseRow = await getPrisma().case.findUnique({
    where: { id: input.caseId },
    select: { id: true, slug: true },
  });
  if (!caseRow) return { ok: false, error: "Case not found" };

  if (input.id) {
    await getPrisma().caseSource.update({
      where: { id: input.id },
      data: {
        title,
        url,
        publisher: input.publisher?.trim() || null,
        citationNote: input.citationNote?.trim() || null,
      },
    });
  } else {
    await getPrisma().caseSource.create({
      data: {
        caseId: caseRow.id,
        title,
        url,
        publisher: input.publisher?.trim() || null,
        citationNote: input.citationNote?.trim() || null,
        accessedAt: new Date(),
      },
    });
  }

  revalidateAdmin(`/cases/${caseRow.slug}`, `/admin/cases/${caseRow.id}`, "/admin/sources");
  return { ok: true };
}

export async function deleteCaseSource(sourceId: string): Promise<AdminActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };

  const source = await getPrisma().caseSource.delete({
    where: { id: sourceId },
    select: { case: { select: { id: true, slug: true } } },
  });
  revalidateAdmin(
    `/cases/${source.case.slug}`,
    `/admin/cases/${source.case.id}`,
    "/admin/sources",
  );
  return { ok: true };
}

// ─── Fictional cases ─────────────────────────────────────────────────────────

const fictionalSchema = z.object({
  caseCode: z.string().trim().min(2).max(32),
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().min(3).max(80).optional(),
  synopsis: z.string().trim().min(20).max(12000),
  setting: z.string().trim().max(200).optional().nullable(),
  difficulty: z.enum(["NOVICE", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedMinutes: z.coerce.number().int().min(5).max(600).optional().nullable(),
});

export async function upsertFictionalCase(input: {
  id?: string;
  caseCode: string;
  title: string;
  slug?: string;
  synopsis: string;
  setting?: string | null;
  difficulty: FictionalDifficulty;
  estimatedMinutes?: number | null;
}): Promise<AdminActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = fictionalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid fictional case" };
  }

  const slug = parsed.data.slug?.trim() || slugify(parsed.data.title);
  const data = {
    caseCode: parsed.data.caseCode.toUpperCase(),
    title: parsed.data.title,
    slug,
    synopsis: parsed.data.synopsis,
    setting: parsed.data.setting || null,
    difficulty: parsed.data.difficulty,
    estimatedMinutes: parsed.data.estimatedMinutes ?? null,
    isFictional: true as const,
  };

  try {
    if (input.id) {
      await getPrisma().fictionalCase.update({ where: { id: input.id }, data });
      revalidateAdmin(`/fictional/${slug}`, `/admin/fictional/${input.id}`);
      return { ok: true, id: input.id };
    }
    const created = await getPrisma().fictionalCase.create({
      data: { ...data, published: false },
      select: { id: true },
    });
    revalidateAdmin(`/admin/fictional/${created.id}`);
    return { ok: true, id: created.id };
  } catch {
    return { ok: false, error: "Case code or slug already exists" };
  }
}

export async function setFictionalPublished(
  fictionalCaseId: string,
  published: boolean,
): Promise<AdminActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };

  const row = await getPrisma().fictionalCase.update({
    where: { id: fictionalCaseId },
    data: {
      published,
      publishedAt: published ? new Date() : null,
    },
    select: { slug: true },
  });
  revalidateAdmin(`/fictional/${row.slug}`);
  return { ok: true };
}

// ─── Moderation ──────────────────────────────────────────────────────────────

export async function adminSetReportStatus(
  reportId: string,
  status: ReportStatus,
): Promise<AdminActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };

  await getPrisma().report.update({
    where: { id: reportId },
    data: {
      status,
      resolvedAt:
        status === "RESOLVED" || status === "DISMISSED" ? new Date() : null,
    },
  });
  revalidateAdmin();
  return { ok: true };
}

export async function adminSetDiscussionStatus(
  discussionId: string,
  status: DiscussionStatus,
): Promise<AdminActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };

  await getPrisma().discussion.update({
    where: { id: discussionId },
    data: {
      status,
      deletedAt: status === "HIDDEN" ? new Date() : null,
    },
  });
  revalidateAdmin(`/discussions/${discussionId}`);
  return { ok: true };
}

export async function adminSoftDeleteComment(
  commentId: string,
): Promise<AdminActionResult> {
  const gate = await requireAdminAction();
  if (!gate.ok) return { ok: false, error: gate.error };

  const comment = await getPrisma().comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
    select: { discussionId: true },
  });
  revalidateAdmin(`/discussions/${comment.discussionId}`);
  return { ok: true };
}

export async function adminRedirectToCase(caseId: string) {
  const gate = await requireAdminAction();
  if (!gate.ok) redirect("/cases");
  redirect(`/admin/cases/${caseId}`);
}
