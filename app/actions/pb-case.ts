"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getCasesPrisma } from "@/lib/cases-db";
import { asStringArray } from "@/lib/cases/json-arrays";
import { writeAuditLog } from "@/lib/pb-case/audit";
import { requirePbCaseAdminAction } from "@/lib/pb-case/auth";
import { evaluatePublishGate } from "@/lib/pb-case/publish-gate";
import {
  syncResearchCaseToPublic,
  unpublishPublicCase,
} from "@/lib/pb-case/sync-public-case";
import {
  assertCanEnableWorldDomination,
  WORLD_DOMINATION_MAX,
} from "@/lib/pb-case/world-domination";
import { queueCaseResearch } from "@/lib/research/pipeline";
import {
  planClaimCollapse,
  planPersonCollapse,
} from "@/lib/pb-case/dedupe-review";

function revalidatePublicCases(slug?: string) {
  revalidatePath("/cases");
  revalidatePath("/");
  revalidateTag("cases-public", "max");
  if (slug) {
    revalidatePath(`/cases/${slug}`);
    revalidatePath(`/research-cases/${slug}`);
  }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function createCaseAction(formData: FormData) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const title = String(formData.get("title") || "").trim();
  if (title.length < 3) return { ok: false as const, error: "Seed title required" };

  const eventDateText = String(formData.get("eventDateText") || "").trim() || null;
  const location = String(formData.get("location") || "").trim() || null;
  let slug = slugify(title) || `case-${Date.now()}`;

  const db = getCasesPrisma();
  const clash = await db.caseFile.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const created = await db.caseFile.create({
    data: {
      title,
      slug,
      eventDateText,
      location,
      status: "draft",
      contentWarning: true,
      preferOfficialSources: true,
    },
  });

  await writeAuditLog({
    actor: gate.admin.username,
    action: "case.create",
    entityType: "case",
    entityId: created.id,
    meta: { title, slug },
  });

  revalidatePath("/pb-case");
  return { ok: true as const, id: created.id };
}

/**
 * Admin-only: queue a research job in the cases DB.
 * External Python worker polls `research_runs` (status=queued).
 * Web app never calls OpenAI / Brave.
 */
export async function startResearchAction(caseId: string) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const result = await queueCaseResearch({
    caseId,
    actor: gate.admin.username,
  });
  revalidatePath("/pb-case");
  revalidatePath(`/pb-case/cases/${caseId}`);
  return { ok: true as const, ...result };
}

/**
 * One-shot cleanup for polluted review lists (e.g. JFK ×3 people).
 * Merges near-duplicate claims and same-name people; keeps highest review status.
 */
export async function dedupeReviewRowsAction(caseId: string) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const db = getCasesPrisma();
  const caseFile = await db.caseFile.findUnique({
    where: { id: caseId },
    include: { claims: true, people: true },
  });
  if (!caseFile) return { ok: false as const, error: "Not found" };

  const claimPlans = planClaimCollapse(caseFile.claims);
  let claimsRemoved = 0;
  for (const plan of claimPlans) {
    await db.claim.update({
      where: { id: plan.survivorId },
      data: { sources: plan.mergedSources },
    });
    if (plan.deleteIds.length) {
      const res = await db.claim.deleteMany({
        where: { id: { in: plan.deleteIds } },
      });
      claimsRemoved += res.count;
    }
  }

  const peoplePlans = planPersonCollapse(caseFile.people);
  let peopleRemoved = 0;
  for (const plan of peoplePlans) {
    await db.person.update({
      where: { id: plan.survivorId },
      data: {
        name: plan.name,
        role: plan.role,
        legalStatus: plan.legalStatus as never,
        sources: plan.mergedSources,
      },
    });
    if (plan.deleteIds.length) {
      const res = await db.person.deleteMany({
        where: { id: { in: plan.deleteIds } },
      });
      peopleRemoved += res.count;
    }
  }

  await writeAuditLog({
    actor: gate.admin.username,
    action: "case.dedupe_review_rows",
    entityType: "case",
    entityId: caseId,
    meta: { claimsRemoved, peopleRemoved },
  });
  revalidatePath(`/pb-case/cases/${caseId}`);
  return {
    ok: true as const,
    claimsRemoved,
    peopleRemoved,
  };
}

export async function reviewClaimAction(
  claimId: string,
  status: "approved" | "rejected" | "disputed" | "pending",
) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const db = getCasesPrisma();
  const claim = await db.claim.update({
    where: { id: claimId },
    data: {
      status,
      disputed: status === "disputed" ? true : undefined,
    },
  });
  await writeAuditLog({
    actor: gate.admin.username,
    action: "claim.review",
    entityType: "claim",
    entityId: claimId,
    meta: { status, caseId: claim.caseId },
  });
  revalidatePath(`/pb-case/cases/${claim.caseId}`);
  return { ok: true as const };
}

export async function reviewPersonAction(
  personId: string,
  status: "approved" | "rejected" | "pending",
) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const db = getCasesPrisma();
  const person = await db.person.update({
    where: { id: personId },
    data: { status },
  });
  await writeAuditLog({
    actor: gate.admin.username,
    action: "person.review",
    entityType: "person",
    entityId: personId,
    meta: { status, caseId: person.caseId },
  });
  revalidatePath(`/pb-case/cases/${person.caseId}`);
  return { ok: true as const };
}

export async function publishCaseAction(caseId: string) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const check = await evaluatePublishGate(caseId);
  if (!check.ok) return { ok: false as const, error: check.errors.join(" ") };

  const db = getCasesPrisma();
  const previous = await db.caseFile.findUnique({
    where: { id: caseId },
    select: { status: true, publishedAt: true, publishedBy: true, slug: true },
  });
  if (!previous) return { ok: false as const, error: "Case not found" };

  const publishedAt = new Date();
  await db.caseFile.update({
    where: { id: caseId },
    data: {
      status: "published",
      publishedAt,
      publishedBy: gate.admin.username,
      lastReviewedAt: publishedAt,
      needsReverify: false,
    },
  });

  // Promote into main Postgres Case so /cases list + detail show this file.
  // Workers never call this path — only explicit admin Publish.
  let sync: Awaited<ReturnType<typeof syncResearchCaseToPublic>>;
  try {
    sync = await syncResearchCaseToPublic(caseId, {
      published: true,
      publishedBy: gate.admin.username,
    });
  } catch (err) {
    await db.caseFile.update({
      where: { id: caseId },
      data: {
        status: previous.status,
        publishedAt: previous.publishedAt,
        publishedBy: previous.publishedBy,
      },
    });
    const message =
      err instanceof Error ? err.message : "Public cases sync failed";
    return { ok: false as const, error: `Publish aborted: ${message}` };
  }

  if (!sync.ok) {
    await db.caseFile.update({
      where: { id: caseId },
      data: {
        status: previous.status,
        publishedAt: previous.publishedAt,
        publishedBy: previous.publishedBy,
      },
    });
    return { ok: false as const, error: `Publish aborted: ${sync.error}` };
  }

  await writeAuditLog({
    actor: gate.admin.username,
    action: "case.publish",
    entityType: "case",
    entityId: caseId,
    meta: { publicCaseId: sync.publicCaseId, publicSlug: sync.slug },
  });
  revalidatePath("/pb-case");
  revalidatePath(`/pb-case/cases/${caseId}`);
  revalidatePublicCases(sync.slug || previous.slug);
  return { ok: true as const, publicSlug: sync.slug };
}

export async function unpublishCaseAction(caseId: string) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const db = getCasesPrisma();
  const previous = await db.caseFile.findUnique({
    where: { id: caseId },
    select: { slug: true },
  });

  await db.caseFile.update({
    where: { id: caseId },
    data: { status: "unpublished", publishedAt: null },
  });

  let publicSlug = previous?.slug ?? "";
  try {
    const sync = await unpublishPublicCase(caseId);
    if (sync.ok && sync.slug) publicSlug = sync.slug;
  } catch (err) {
    // Research DB already unpublished; surface sync failure so admin can retry.
    const message =
      err instanceof Error ? err.message : "Public cases unpublish failed";
    return { ok: false as const, error: message };
  }

  await writeAuditLog({
    actor: gate.admin.username,
    action: "case.unpublish",
    entityType: "case",
    entityId: caseId,
    meta: { publicSlug },
  });
  revalidatePath("/pb-case");
  revalidatePath(`/pb-case/cases/${caseId}`);
  revalidatePublicCases(publicSlug || undefined);
  return { ok: true as const };
}

export async function setWorldDominationAction(
  caseId: string,
  enabled: boolean,
) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  if (enabled) {
    const can = await assertCanEnableWorldDomination(caseId);
    if (!can.ok) return can;
  }

  const db = getCasesPrisma();
  const current = await db.caseFile.findUnique({ where: { id: caseId } });
  if (!current) return { ok: false as const, error: "Not found" };

  let nextLabels = asStringArray(current.labels).filter(
    (l) => l !== "world_domination",
  );
  if (enabled) nextLabels = [...nextLabels, "world_domination"];

  await db.caseFile.update({
    where: { id: caseId },
    data: {
      worldDomination: enabled,
      labels: nextLabels,
    },
  });

  await writeAuditLog({
    actor: gate.admin.username,
    action: enabled ? "case.world_domination.on" : "case.world_domination.off",
    entityType: "case",
    entityId: caseId,
    meta: { max: WORLD_DOMINATION_MAX },
  });
  revalidatePath("/pb-case");
  revalidatePath(`/pb-case/cases/${caseId}`);
  revalidatePath("/pb-case/labels");
  return { ok: true as const };
}

export async function updateLabelsAction(caseId: string, labelsRaw: string) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const labels = labelsRaw
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean)
    .slice(0, 20);

  const wantsWd = labels.includes("world_domination");
  if (wantsWd) {
    const can = await assertCanEnableWorldDomination(caseId);
    if (!can.ok) return can;
  }

  await getCasesPrisma().caseFile.update({
    where: { id: caseId },
    data: {
      labels,
      worldDomination: wantsWd,
    },
  });
  await writeAuditLog({
    actor: gate.admin.username,
    action: "case.labels",
    entityType: "case",
    entityId: caseId,
    meta: { labels },
  });
  revalidatePath("/pb-case/labels");
  revalidatePath(`/pb-case/cases/${caseId}`);
  return { ok: true as const };
}

export async function reviewCandidateAction(
  candidateId: string,
  status: "accepted" | "rejected" | "dismissed",
) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const db = getCasesPrisma();
  let linkedCaseId: string | null = null;

  if (status === "accepted") {
    const candidate = await db.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) return { ok: false as const, error: "Not found" };
    const slugBase = slugify(candidate.title) || `candidate-${Date.now()}`;
    const created = await db.caseFile.create({
      data: {
        title: candidate.title,
        slug: `${slugBase}-${Date.now().toString(36)}`,
        summary: "",
        status: "draft",
        contentWarning: true,
        preferOfficialSources: true,
        sources: asStringArray(candidate.sourceUrls).map((url) => ({ url })),
      },
    });
    linkedCaseId = created.id;
  }

  await db.candidate.update({
    where: { id: candidateId },
    data: {
      status,
      reviewedAt: new Date(),
      linkedCaseId,
    },
  });
  await writeAuditLog({
    actor: gate.admin.username,
    action: "candidate.review",
    entityType: "candidate",
    entityId: candidateId,
    meta: { status, linkedCaseId },
  });
  revalidatePath("/pb-case/trending");
  return { ok: true as const, linkedCaseId };
}

export async function resolveTakedownAction(
  id: string,
  status: "resolved" | "rejected" | "reviewing",
  note?: string,
) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  await getCasesPrisma().takedownRequest.update({
    where: { id },
    data: {
      status,
      resolutionNote: note?.slice(0, 1000),
      resolvedAt: status === "reviewing" ? null : new Date(),
    },
  });
  await writeAuditLog({
    actor: gate.admin.username,
    action: "takedown.resolve",
    entityType: "takedown_request",
    entityId: id,
    meta: { status },
  });
  revalidatePath("/pb-case/takedowns");
  return { ok: true as const };
}
