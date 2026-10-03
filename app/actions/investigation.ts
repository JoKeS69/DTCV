"use server";

import { revalidatePath } from "next/cache";
import { getCasesPrisma } from "@/lib/cases-db";
import { requirePbCaseAdminAction } from "@/lib/pb-case/auth";
import { writeAuditLog } from "@/lib/pb-case/audit";
import { rateLimit, userRateKey } from "@/lib/rate-limit";
import { resolveAccusation } from "@/lib/investigation/accusation";
import {
  formatAlibiReply,
  formatBackgroundReply,
  formatUnknownAgentReply,
  fuzzyMatchSuspect,
  parseAgentCommand,
} from "@/lib/investigation/agent-commands";
import { generateInvestigationCase } from "@/lib/investigation/generate";
import {
  chatWithAgent,
  interrogateSuspect,
} from "@/lib/investigation/interrogate";
import { INVESTIGATION_LIMITS, INVESTIGATION_MAX } from "@/lib/investigation/limits";
import {
  ensureGuestPlayerToken,
  normalizeDisplayNameInput,
} from "@/lib/investigation/player";
import { sanitizePlayerText, slugifyTitle } from "@/lib/investigation/sanitize";
import {
  draftToCreateData,
  parseBoardConnections,
  parseCaseLog,
  parseChatHistory,
  parseFieldAgents,
  parseStringIdArray,
  rowToDraft,
} from "@/lib/investigation/serialize";
import type {
  BoardConnection,
  CaseLogEntry,
  ChatHistory,
  ChatMessage,
  InvestigationCaseDraft,
} from "@/lib/investigation/types";
import { validateInvestigationCase } from "@/lib/investigation/validate";
import { requireFictionalAccessAction } from "@/lib/billing/gate";

function revalidateFictional(slug?: string) {
  revalidatePath("/fictional");
  revalidatePath("/pb-case");
  if (slug) revalidatePath(`/fictional/investigate/${slug}`);
}

function pushLog(
  log: CaseLogEntry[],
  kind: string,
  text: string,
): CaseLogEntry[] {
  return [
    ...log,
    { at: new Date().toISOString(), kind, text },
  ].slice(-200);
}

function asChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    role:
      m.role === "assistant"
        ? ("assistant" as const)
        : m.role === "system"
          ? ("system" as const)
          : ("user" as const),
    content: String(m.content ?? ""),
    at: String(m.at ?? new Date().toISOString()),
  }));
}

function appendChat(
  prior: ChatMessage[],
  userText: string,
  assistantText: string,
): ChatMessage[] {
  const now = new Date().toISOString();
  return asChatMessages([
    ...prior,
    { role: "user", content: userText, at: now },
    { role: "assistant", content: assistantText, at: now },
  ]).slice(-40);
}

async function requirePlayerState(caseSlug: string, displayName?: string) {
  const access = await requireFictionalAccessAction();
  if (!access.ok) {
    return { ok: false as const, error: access.error };
  }

  const db = getCasesPrisma();
  const row = await db.investigationCase.findFirst({
    where: { slug: caseSlug, status: "published" },
  });
  if (!row) return { ok: false as const, error: "Case not found" };

  const identity = await ensureGuestPlayerToken();
  let state = await db.investigationPlayerState.findUnique({
    where: {
      caseId_playerKey: { caseId: row.id, playerKey: identity.playerKey },
    },
  });

  const name =
    normalizeDisplayNameInput(displayName) ||
    state?.displayName ||
    normalizeDisplayNameInput(identity.displayName);

  if (!state) {
    if (!name) {
      return { ok: false as const, error: "Enter a display name to begin" };
    }
    state = await db.investigationPlayerState.create({
      data: {
        caseId: row.id,
        userId: identity.userId,
        playerKey: identity.playerKey,
        displayName: name,
      },
    });
  } else if (name && name !== state.displayName) {
    state = await db.investigationPlayerState.update({
      where: { id: state.id },
      data: { displayName: name },
    });
  }

  return { ok: true as const, row, state, draft: rowToDraft(row), identity };
}

/** PB CASE: generate an original fictional investigation case (draft). */
export async function generateFictionalInvestigationAction(formData: FormData) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const rl = rateLimit(
    userRateKey("inv-gen", gate.admin.id),
    INVESTIGATION_LIMITS.generate,
  );
  if (!rl.ok) {
    return {
      ok: false as const,
      error: `Rate limited — retry in ${rl.retryAfterSec}s`,
    };
  }

  const prompt = sanitizePlayerText(
    formData.get("prompt"),
    INVESTIGATION_MAX.generatePrompt,
  );
  const preferLlm = String(formData.get("preferLlm") || "1") !== "0";

  const generated = await generateInvestigationCase({ prompt, preferLlm });
  if (!generated.ok) return { ok: false as const, error: generated.error };

  let draft = generated.draft;
  const v = validateInvestigationCase(draft);
  if (!v.ok) {
    return {
      ok: false as const,
      error: v.issues.map((i) => i.message).join("; "),
    };
  }

  const db = getCasesPrisma();
  let slug = draft.slug || slugifyTitle(draft.title);
  const clash = await db.investigationCase.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;
  draft = { ...draft, slug };

  const created = await db.investigationCase.create({
    data: draftToCreateData(draft, "draft", gate.admin.username),
  });

  await writeAuditLog({
    actor: gate.admin.username,
    action: "investigation.generate",
    entityType: "investigation_case",
    entityId: created.id,
    meta: { slug, source: generated.source, title: draft.title },
  });

  revalidatePath("/pb-case");
  return {
    ok: true as const,
    id: created.id,
    slug: created.slug,
    title: created.title,
    source: generated.source,
  };
}

/** Publish fictional investigation case → Fictional cases ONLY (never /cases). */
export async function publishInvestigationCaseAction(caseId: string) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const db = getCasesPrisma();
  const row = await db.investigationCase.findUnique({ where: { id: caseId } });
  if (!row) return { ok: false as const, error: "Case not found" };

  const draft = rowToDraft(row);
  const v = validateInvestigationCase(draft);
  if (!v.ok) {
    return {
      ok: false as const,
      error: `Publish blocked: ${v.issues.map((i) => i.message).join("; ")}`,
    };
  }

  const updated = await db.investigationCase.update({
    where: { id: caseId },
    data: {
      status: "published",
      publishedAt: new Date(),
      publishedBy: gate.admin.username,
    },
  });

  await writeAuditLog({
    actor: gate.admin.username,
    action: "investigation.publish",
    entityType: "investigation_case",
    entityId: caseId,
    meta: {
      slug: updated.slug,
      fictionalOnly: true,
      neverPublicCases: true,
    },
  });

  revalidateFictional(updated.slug);
  return { ok: true as const, slug: updated.slug };
}

export async function unpublishInvestigationCaseAction(caseId: string) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const db = getCasesPrisma();
  const updated = await db.investigationCase.update({
    where: { id: caseId },
    data: { status: "draft", publishedAt: null },
  });

  await writeAuditLog({
    actor: gate.admin.username,
    action: "investigation.unpublish",
    entityType: "investigation_case",
    entityId: caseId,
    meta: { slug: updated.slug },
  });

  revalidateFictional(updated.slug);
  return { ok: true as const };
}

export async function seedSampleInvestigationCasesAction() {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const { SAMPLE_INVESTIGATION_CASES } = await import(
    "@/lib/investigation/sample-cases"
  );
  const db = getCasesPrisma();
  let upserted = 0;
  for (const sample of SAMPLE_INVESTIGATION_CASES) {
    const v = validateInvestigationCase(sample);
    if (!v.ok) continue;
    await db.investigationCase.upsert({
      where: { slug: sample.slug },
      create: draftToCreateData(sample, "published", gate.admin.username),
      update: {
        ...draftToCreateData(sample, "published", gate.admin.username),
        // keep published
      },
    });
    upserted += 1;
  }

  revalidateFictional();
  return { ok: true as const, upserted };
}

export async function startInvestigationAction(formData: FormData) {
  const slug = sanitizePlayerText(formData.get("slug"), 120);
  const displayName = formData.get("displayName");
  const session = await requirePlayerState(slug, String(displayName ?? ""));
  if (!session.ok) return { ok: false as const, error: session.error };

  const log = pushLog(
    parseCaseLog(session.state.caseLog),
    "start",
    `${session.state.displayName} opened the case file.`,
  );
  await getCasesPrisma().investigationPlayerState.update({
    where: { id: session.state.id },
    data: { caseLog: log },
  });

  revalidatePath(`/fictional/investigate/${slug}`);
  return { ok: true as const };
}

export async function reviewSuspectAction(caseSlug: string, suspectId: string) {
  const session = await requirePlayerState(caseSlug);
  if (!session.ok) return { ok: false as const, error: session.error };
  if (session.state.status !== "unsolved") {
    return { ok: false as const, error: "Case already closed" };
  }

  const suspect = session.draft.suspects.find((s) => s.id === suspectId);
  if (!suspect) return { ok: false as const, error: "Suspect not found" };

  const reviewed = new Set(parseStringIdArray(session.state.reviewedSuspectIds));
  reviewed.add(suspectId);
  const log = pushLog(
    parseCaseLog(session.state.caseLog),
    "dossier",
    `Reviewed dossier: ${suspect.name} (${suspect.role}).`,
  );

  await getCasesPrisma().investigationPlayerState.update({
    where: { id: session.state.id },
    data: {
      reviewedSuspectIds: [...reviewed],
      caseLog: log,
    },
  });

  revalidatePath(`/fictional/investigate/${caseSlug}`);
  return {
    ok: true as const,
    dossier: {
      id: suspect.id,
      name: suspect.name,
      role: suspect.role,
      motive: suspect.motive,
      alibi: suspect.alibi,
      statement: suspect.statement,
      personality: suspect.personality,
      // never isGuilty
    },
  };
}

export async function inspectSceneAction(caseSlug: string, locationId: string) {
  const session = await requirePlayerState(caseSlug);
  if (!session.ok) return { ok: false as const, error: session.error };
  if (session.state.status !== "unsolved") {
    return { ok: false as const, error: "Case already closed" };
  }

  const loc = session.draft.locations.find((l) => l.id === locationId);
  if (!loc) return { ok: false as const, error: "Scene not found" };

  const inspected = new Set(parseStringIdArray(session.state.inspectedLocationIds));
  inspected.add(locationId);
  const log = pushLog(
    parseCaseLog(session.state.caseLog),
    "scene",
    `Inspected ${loc.name}: ${loc.clue}`,
  );

  await getCasesPrisma().investigationPlayerState.update({
    where: { id: session.state.id },
    data: {
      inspectedLocationIds: [...inspected],
      caseLog: log,
    },
  });

  revalidatePath(`/fictional/investigate/${caseSlug}`);
  return { ok: true as const, clue: loc.clue, name: loc.name };
}

export async function setBoardConnectionAction(opts: {
  caseSlug: string;
  suspectId: string;
  clueId: string;
  remove?: boolean;
}) {
  const session = await requirePlayerState(opts.caseSlug);
  if (!session.ok) return { ok: false as const, error: session.error };
  if (session.state.status !== "unsolved") {
    return { ok: false as const, error: "Case already closed" };
  }

  let connections = parseBoardConnections(session.state.boardConnections);
  const exists = connections.some(
    (c) => c.suspectId === opts.suspectId && c.clueId === opts.clueId,
  );
  if (opts.remove || exists) {
    connections = connections.filter(
      (c) => !(c.suspectId === opts.suspectId && c.clueId === opts.clueId),
    );
  } else {
    connections = [...connections, { suspectId: opts.suspectId, clueId: opts.clueId }];
  }

  const suspect = session.draft.suspects.find((s) => s.id === opts.suspectId);
  const loc = session.draft.locations.find((l) => l.id === opts.clueId);
  const log = pushLog(
    parseCaseLog(session.state.caseLog),
    "board",
    opts.remove || exists
      ? `Removed board string: ${suspect?.name ?? opts.suspectId} ↔ ${loc?.name ?? opts.clueId}`
      : `Pinned board string: ${suspect?.name ?? opts.suspectId} ↔ ${loc?.name ?? opts.clueId}`,
  );

  await getCasesPrisma().investigationPlayerState.update({
    where: { id: session.state.id },
    data: { boardConnections: connections, caseLog: log },
  });

  revalidatePath(`/fictional/investigate/${opts.caseSlug}`);
  return { ok: true as const, connections };
}

export async function clearBoardAction(caseSlug: string) {
  const session = await requirePlayerState(caseSlug);
  if (!session.ok) return { ok: false as const, error: session.error };

  const log = pushLog(parseCaseLog(session.state.caseLog), "board", "Cleared evidence board.");
  await getCasesPrisma().investigationPlayerState.update({
    where: { id: session.state.id },
    data: { boardConnections: [] as BoardConnection[], caseLog: log },
  });
  revalidatePath(`/fictional/investigate/${caseSlug}`);
  return { ok: true as const };
}

export async function interrogateSuspectAction(formData: FormData) {
  const caseSlug = sanitizePlayerText(formData.get("slug"), 120);
  const suspectId = sanitizePlayerText(formData.get("suspectId"), 80);
  const message = sanitizePlayerText(
    formData.get("message"),
    INVESTIGATION_MAX.chatMessage,
  );
  if (!message) return { ok: false as const, error: "Message required" };

  const session = await requirePlayerState(caseSlug);
  if (!session.ok) return { ok: false as const, error: session.error };
  if (session.state.status !== "unsolved") {
    return { ok: false as const, error: "Case already closed" };
  }

  const rl = rateLimit(
    userRateKey("inv-llm", session.identity.playerKey),
    INVESTIGATION_LIMITS.llm,
  );
  if (!rl.ok) {
    return {
      ok: false as const,
      error: `Rate limited — retry in ${rl.retryAfterSec}s`,
    };
  }

  const suspect = session.draft.suspects.find((s) => s.id === suspectId);
  if (!suspect) return { ok: false as const, error: "Suspect not found" };

  const inspected = new Set(parseStringIdArray(session.state.inspectedLocationIds));
  const discoveredClues = session.draft.locations
    .filter((l) => inspected.has(l.id))
    .map((l) => `${l.name}: ${l.clue}`);

  const history = parseChatHistory(session.state.chatHistory);
  const prior = asChatMessages(history.suspects?.[suspectId] ?? []);
  const reply = await interrogateSuspect({
    suspect,
    draft: session.draft,
    discoveredClues,
    userMessage: message,
    prior: prior.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  });

  const nextMessages = appendChat(prior, message, reply.text);

  const nextHistory: ChatHistory = {
    ...history,
    suspects: { ...(history.suspects ?? {}), [suspectId]: nextMessages },
  };

  const reviewed = new Set(parseStringIdArray(session.state.reviewedSuspectIds));
  reviewed.add(suspectId);

  const log = pushLog(
    parseCaseLog(session.state.caseLog),
    "interrogate",
    `Interrogated ${suspect.name}.`,
  );

  await getCasesPrisma().investigationPlayerState.update({
    where: { id: session.state.id },
    data: {
      chatHistory: nextHistory,
      reviewedSuspectIds: [...reviewed],
      caseLog: log,
    },
  });

  revalidatePath(`/fictional/investigate/${caseSlug}`);
  return {
    ok: true as const,
    reply: reply.text,
    offline: reply.offline,
    messages: nextMessages,
  };
}

export async function contactAgentAction(formData: FormData) {
  const caseSlug = sanitizePlayerText(formData.get("slug"), 120);
  const agentId = sanitizePlayerText(formData.get("agentId"), 80);
  const message = sanitizePlayerText(
    formData.get("message"),
    INVESTIGATION_MAX.agentMessage,
  );
  if (!message) return { ok: false as const, error: "Message required" };

  const session = await requirePlayerState(caseSlug);
  if (!session.ok) return { ok: false as const, error: session.error };
  if (session.state.status !== "unsolved") {
    return { ok: false as const, error: "Case already closed" };
  }

  const rl = rateLimit(
    userRateKey("inv-llm", session.identity.playerKey),
    INVESTIGATION_LIMITS.llm,
  );
  if (!rl.ok) {
    return {
      ok: false as const,
      error: `Rate limited — retry in ${rl.retryAfterSec}s`,
    };
  }

  const agents = parseFieldAgents(session.row.fieldAgents);
  const agent = agents.find((a) => a.id === agentId) ?? agents[0];
  if (!agent) return { ok: false as const, error: "No agents available" };

  const cmd = parseAgentCommand(message);
  let replyText = "";
  let offline = true;

  if (cmd.kind === "background_check" || cmd.kind === "verify_alibi") {
    const match = fuzzyMatchSuspect(cmd.suspectQuery, session.draft.suspects);
    if (!match) {
      replyText = formatUnknownAgentReply();
    } else if (cmd.kind === "background_check") {
      replyText = `${agent.name}: ${formatBackgroundReply(match)}`;
      const checked = new Set(parseStringIdArray(session.state.backgroundCheckedIds));
      checked.add(match.id);
      const log = pushLog(
        parseCaseLog(session.state.caseLog),
        "background",
        `Background check: ${match.name}`,
      );
      const history = parseChatHistory(session.state.chatHistory);
      const nextMessages = appendChat(
        asChatMessages(history.agents?.[agent.id] ?? []),
        message,
        replyText,
      );
      await getCasesPrisma().investigationPlayerState.update({
        where: { id: session.state.id },
        data: {
          backgroundCheckedIds: [...checked],
          caseLog: log,
          chatHistory: {
            ...history,
            agents: { ...(history.agents ?? {}), [agent.id]: nextMessages },
          },
        },
      });
      revalidatePath(`/fictional/investigate/${caseSlug}`);
      return { ok: true as const, reply: replyText, offline: true, messages: nextMessages };
    } else {
      replyText = `${agent.name}: ${formatAlibiReply(match)}`;
      const verified = new Set(parseStringIdArray(session.state.alibiVerifiedIds));
      verified.add(match.id);
      const log = pushLog(
        parseCaseLog(session.state.caseLog),
        "alibi",
        `Verified alibi claim: ${match.name}`,
      );
      const history = parseChatHistory(session.state.chatHistory);
      const nextMessages = appendChat(
        asChatMessages(history.agents?.[agent.id] ?? []),
        message,
        replyText,
      );
      await getCasesPrisma().investigationPlayerState.update({
        where: { id: session.state.id },
        data: {
          alibiVerifiedIds: [...verified],
          caseLog: log,
          chatHistory: {
            ...history,
            agents: { ...(history.agents ?? {}), [agent.id]: nextMessages },
          },
        },
      });
      revalidatePath(`/fictional/investigate/${caseSlug}`);
      return { ok: true as const, reply: replyText, offline: true, messages: nextMessages };
    }
  } else {
    const inspected = new Set(parseStringIdArray(session.state.inspectedLocationIds));
    const discoveredClues = session.draft.locations
      .filter((l) => inspected.has(l.id))
      .map((l) => `${l.name}: ${l.clue}`);
    const reply = await chatWithAgent({
      agent,
      draft: session.draft,
      discoveredClues,
      userMessage: message,
    });
    replyText = reply.text;
    offline = reply.offline;
  }

  const history = parseChatHistory(session.state.chatHistory);
  const nextMessages = appendChat(
    asChatMessages(history.agents?.[agent.id] ?? []),
    message,
    replyText,
  );

  const log = pushLog(
    parseCaseLog(session.state.caseLog),
    "agent",
    `Contacted ${agent.name}.`,
  );

  await getCasesPrisma().investigationPlayerState.update({
    where: { id: session.state.id },
    data: {
      chatHistory: {
        ...history,
        agents: { ...(history.agents ?? {}), [agent.id]: nextMessages },
      },
      caseLog: log,
    },
  });

  revalidatePath(`/fictional/investigate/${caseSlug}`);
  return { ok: true as const, reply: replyText, offline, messages: nextMessages };
}

export async function accuseSuspectAction(formData: FormData) {
  const caseSlug = sanitizePlayerText(formData.get("slug"), 120);
  const suspectId = sanitizePlayerText(formData.get("suspectId"), 80);

  const session = await requirePlayerState(caseSlug);
  if (!session.ok) return { ok: false as const, error: session.error };
  if (session.state.status !== "unsolved") {
    return { ok: false as const, error: "Case already closed" };
  }

  const rl = rateLimit(
    userRateKey("inv-accuse", session.identity.playerKey),
    INVESTIGATION_LIMITS.accuse,
  );
  if (!rl.ok) {
    return {
      ok: false as const,
      error: `Rate limited — retry in ${rl.retryAfterSec}s`,
    };
  }

  const result = resolveAccusation({
    draft: session.draft,
    accusedSuspectId: suspectId,
    priorWrongAccusations: session.state.wrongAccusations,
  });

  if (!result.correct) {
    const log = pushLog(
      parseCaseLog(session.state.caseLog),
      "accusation",
      `Wrong accusation (#${result.wrongAccusations}).`,
    );
    await getCasesPrisma().investigationPlayerState.update({
      where: { id: session.state.id },
      data: {
        wrongAccusations: result.wrongAccusations,
        caseLog: log,
      },
    });
    revalidatePath(`/fictional/investigate/${caseSlug}`);
    return {
      ok: true as const,
      correct: false as const,
      message: result.message,
      wrongAccusations: result.wrongAccusations,
    };
  }

  const log = pushLog(
    parseCaseLog(session.state.caseLog),
    "accusation",
    `Case closed — correct accusation (${result.status}).`,
  );

  await getCasesPrisma().investigationPlayerState.update({
    where: { id: session.state.id },
    data: {
      status: result.status,
      closedAt: new Date(),
      solutionReveal: result.reveal,
      caseLog: log,
    },
  });

  revalidatePath(`/fictional/investigate/${caseSlug}`);
  revalidatePath("/fictional");
  return {
    ok: true as const,
    correct: true as const,
    status: result.status,
    reveal: result.reveal,
  };
}

/** Admin authoring: upsert full draft JSON (validated). */
export async function upsertInvestigationDraftAction(
  draft: InvestigationCaseDraft,
  publish: boolean,
) {
  const gate = await requirePbCaseAdminAction();
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const v = validateInvestigationCase(draft);
  if (!v.ok) {
    return {
      ok: false as const,
      error: v.issues.map((i) => i.message).join("; "),
    };
  }

  const db = getCasesPrisma();
  const slug = draft.slug || slugifyTitle(draft.title);
  const existing = await db.investigationCase.findUnique({ where: { slug } });
  const data = draftToCreateData(
    { ...draft, slug },
    publish ? "published" : "draft",
    gate.admin.username,
  );

  const row = await db.investigationCase.upsert({
    where: { slug },
    create: data,
    update: {
      ...data,
      publishedAt: publish ? new Date() : existing?.publishedAt ?? null,
      status: publish ? "published" : "draft",
    },
  });

  revalidateFictional(row.slug);
  return { ok: true as const, id: row.id, slug: row.slug };
}
