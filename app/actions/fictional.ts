"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/db";
import { scoreTheory, xpForScore } from "@/lib/fictional/scoring";
import {
  awardAchievement,
  syncRankFromXp,
} from "@/lib/progression/achievements";
import { getDetectiveStats } from "@/lib/progression/stats";

export type FictionalActionResult =
  | { ok: true; investigationId?: string; submissionId?: string }
  | { ok: false; error: string };

async function requireUser(): Promise<
  | { ok: true; userId: string; error?: undefined }
  | { ok: false; userId?: undefined; error: string }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Sign in required" };
  }
  return { ok: true, userId };
}

export async function startOrContinueInvestigation(
  fictionalCaseId: string,
  slug: string,
): Promise<FictionalActionResult> {
  const gate = await requireUser();
  if (!gate.ok) return { ok: false, error: gate.error };

  const caseFile = await getPrisma().fictionalCase.findFirst({
    where: { id: fictionalCaseId, published: true, isFictional: true },
    select: { id: true, title: true, slug: true },
  });
  if (!caseFile) return { ok: false, error: "Fictional case not found" };

  const existing = await getPrisma().investigation.findFirst({
    where: {
      userId: gate.userId,
      fictionalCaseId: caseFile.id,
      target: "FICTIONAL_CASE",
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });

  if (existing) {
    revalidatePath(`/fictional/${slug}`);
    return { ok: true, investigationId: existing.id };
  }

  const created = await getPrisma().investigation.create({
    data: {
      userId: gate.userId,
      target: "FICTIONAL_CASE",
      fictionalCaseId: caseFile.id,
      title: caseFile.title,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  await getPrisma().$transaction(async (tx) => {
    await awardAchievement(tx, gate.userId, "FIRST_BRIEFING");
  });

  revalidatePath(`/fictional/${slug}`);
  revalidatePath("/fictional");
  revalidatePath("/profile");
  revalidatePath(`/detectives`);
  return { ok: true, investigationId: created.id };
}

export async function addInvestigationNote(input: {
  investigationId: string;
  body: string;
  slug: string;
}): Promise<FictionalActionResult> {
  const gate = await requireUser();
  if (!gate.ok) return { ok: false, error: gate.error };

  const body = input.body.trim();
  if (body.length < 1 || body.length > 4000) {
    return { ok: false, error: "Note must be 1–4000 characters" };
  }

  const investigation = await getPrisma().investigation.findFirst({
    where: {
      id: input.investigationId,
      userId: gate.userId,
      target: "FICTIONAL_CASE",
    },
    select: { id: true, status: true },
  });
  if (!investigation) return { ok: false, error: "Investigation not found" };
  if (investigation.status === "SUBMITTED") {
    return { ok: false, error: "Investigation already submitted" };
  }

  await getPrisma().investigationNote.create({
    data: { investigationId: investigation.id, body },
  });

  revalidatePath(`/fictional/${input.slug}`);
  return { ok: true };
}

const theorySchema = z.object({
  investigationId: z.string().min(1),
  slug: z.string().min(1),
  suspectId: z.string().min(1),
  motive: z.string().trim().min(10).max(4000),
  timeline: z.string().trim().min(10).max(4000),
  evidenceInterpretation: z.string().trim().min(10).max(4000),
  reasoning: z.string().trim().min(10).max(4000),
});

/**
 * Score theory server-side. Solution is loaded only here — never returned
 * in the action result beyond redirecting to the results page.
 */
export async function submitTheory(input: {
  investigationId: string;
  slug: string;
  suspectId: string;
  motive: string;
  timeline: string;
  evidenceInterpretation: string;
  reasoning: string;
}): Promise<FictionalActionResult> {
  const gate = await requireUser();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = theorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid theory (each field needs at least 10 characters)",
    };
  }

  const investigation = await getPrisma().investigation.findFirst({
    where: {
      id: parsed.data.investigationId,
      userId: gate.userId,
      target: "FICTIONAL_CASE",
    },
    select: {
      id: true,
      status: true,
      fictionalCaseId: true,
      submission: { select: { id: true } },
    },
  });
  if (!investigation?.fictionalCaseId) {
    return { ok: false, error: "Investigation not found" };
  }
  if (investigation.status === "SUBMITTED" || investigation.submission) {
    redirect(`/fictional/${parsed.data.slug}/result`);
  }

  const suspect = await getPrisma().suspect.findFirst({
    where: {
      id: parsed.data.suspectId,
      fictionalCaseId: investigation.fictionalCaseId,
    },
    select: { id: true },
  });
  if (!suspect) return { ok: false, error: "Invalid suspect" };

  // SERVER-ONLY: load Solution for scoring — do not pass to client props.
  const solution = await getPrisma().solution.findUnique({
    where: { fictionalCaseId: investigation.fictionalCaseId },
    select: {
      culpritSuspectId: true,
      keyEvidenceCodes: true,
      motiveKeywords: true,
      timelineKeywords: true,
      reasoningKeywords: true,
    },
  });
  if (!solution) return { ok: false, error: "Solution not configured" };

  const scores = scoreTheory(
    {
      suspectId: parsed.data.suspectId,
      motive: parsed.data.motive,
      timeline: parsed.data.timeline,
      evidenceInterpretation: parsed.data.evidenceInterpretation,
      reasoning: parsed.data.reasoning,
    },
    solution,
  );

  const xp = xpForScore(scores.total);

  await getPrisma().$transaction(async (tx) => {
    await tx.theorySubmission.create({
      data: {
        investigationId: investigation.id,
        suspectId: parsed.data.suspectId,
        motive: parsed.data.motive,
        timeline: parsed.data.timeline,
        evidenceInterpretation: parsed.data.evidenceInterpretation,
        reasoning: parsed.data.reasoning,
        scoreTotal: scores.total,
        scoreSuspect: scores.suspect,
        scoreMotive: scores.motive,
        scoreTimeline: scores.timeline,
        scoreEvidence: scores.evidence,
        scoreReasoning: scores.reasoning,
        xpAwarded: xp,
      },
    });

    await tx.investigation.update({
      where: { id: investigation.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });

    // Score XP only from fictional completion — never real-case accusations.
    await tx.user.update({
      where: { id: gate.userId },
      data: { detectiveXP: { increment: xp } },
    });
    await syncRankFromXp(tx, gate.userId);

    if (scores.total >= 50) {
      await awardAchievement(tx, gate.userId, "HOUSE_1147");
    }
    if (scores.total >= 90) {
      await awardAchievement(tx, gate.userId, "SHARP_EYE");
    }
    if (scores.total >= 100) {
      await awardAchievement(tx, gate.userId, "PERFECT_CASE");
    }
  });

  // Streak achievement after transaction (needs aggregated stats)
  const stats = await getDetectiveStats(gate.userId);
  if (stats.streakDays >= 3) {
    await getPrisma().$transaction(async (tx) => {
      await awardAchievement(tx, gate.userId, "STREAK_3");
    });
  }

  const user = await getPrisma().user.findUnique({
    where: { id: gate.userId },
    select: { username: true },
  });

  revalidatePath(`/fictional/${parsed.data.slug}`);
  revalidatePath(`/fictional/${parsed.data.slug}/result`);
  revalidatePath("/fictional");
  revalidatePath("/profile");
  if (user?.username) revalidatePath(`/detectives/${user.username}`);
  revalidatePath("/fictional/rankings");

  redirect(`/fictional/${parsed.data.slug}/result`);
}
