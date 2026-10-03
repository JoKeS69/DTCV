"use server";

import { revalidatePath } from "next/cache";
import { getCasesPrisma } from "@/lib/cases-db";
import { asStringArray } from "@/lib/cases/json-arrays";
import { writeAuditLog } from "@/lib/pb-case/audit";
import { requirePbCaseAdminAction } from "@/lib/pb-case/auth";
import { evaluatePublishGate } from "@/lib/pb-case/publish-gate";
import {
  assertCanEnableWorldDomination,
  WORLD_DOMINATION_MAX,
} from "@/lib/pb-case/world-domination";
import { queueCaseResearch } from "@/lib/research/pipeline";

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
  if (title.length < 3) return { ok: false as const, error: "Title required" };

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
  await db.caseFile.update({
    where: { id: caseId },
    data: {
      status: "published",
      publishedAt: new Date(),
      publishedBy: gate.admin.username,
      lastReviewedAt: new Date(),
      needsReverify: false,
    },
  });
  await writeAuditLog({
    actor: gate.admin.username,
    action: "case.publish",
    entityType: "case",
    entityId: caseId,
  });
  revalidatePath("/pb-case");
  revalidatePath(`/pb-case/cases/${caseId}`);
  revalidatePath("/");
  return { ok: true as const };
}

export async function unpublishCaseAction(caseId: string) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  await getCasesPrisma().caseFile.update({
    where: { id: caseId },
    data: { status: "unpublished", publishedAt: null },
  });
  await writeAuditLog({
    actor: gate.admin.username,
    action: "case.unpublish",
    entityType: "case",
    entityId: caseId,
  });
  revalidatePath("/pb-case");
  revalidatePath(`/pb-case/cases/${caseId}`);
  revalidatePath("/");
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
