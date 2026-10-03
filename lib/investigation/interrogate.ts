import type {
  InvestigationCaseDraft,
  InvestigationFieldAgent,
  InvestigationSuspect,
} from "./types";
import { investigationChatCompletion } from "./openai";
import { sanitizePlayerText } from "./sanitize";

export function buildSuspectSystemPrompt(opts: {
  suspect: InvestigationSuspect;
  draft: InvestigationCaseDraft;
  discoveredClues: string[];
}): string {
  const { suspect, draft, discoveredClues } = opts;
  const guiltLine = suspect.isGuilty
    ? "You are guilty. Be defensive and evasive. Never give a clean confession. Only under strong confrontation with discovered evidence may you show small contradictions or partial truths."
    : "You are innocent. Deny consistently. You may keep embarrassing secrets unrelated to the murder.";

  return [
    `You are ${suspect.name}, ${suspect.role}, in a fictional murder investigation game.`,
    `Case: ${draft.title}. Victim(s): ${draft.victims.join(", ")}. Location: ${draft.location}.`,
    `Personality: ${suspect.personality}.`,
    `Private motive (do not blurt unless cornered): ${suspect.motive}.`,
    `Official alibi you claim: ${suspect.alibi}.`,
    `Official statement on file: ${suspect.statement}.`,
    guiltLine,
    `Player has only discovered these clues so far:\n- ${discoveredClues.join("\n- ") || "(none yet)"}`,
    "Reply in 2–4 sentences, fully in character. Never mention being AI or a language model.",
  ].join("\n");
}

export function offlineSuspectReply(
  suspect: InvestigationSuspect,
  userMessage: string,
): string {
  const q = userMessage.toLowerCase();
  if (suspect.isGuilty) {
    if (/alibi|where were you|camera|key|weapon|letter opener|chisel|knife/.test(q)) {
      return `${suspect.name} shifts in the chair. "I already gave my alibi — ${suspect.alibi}. People love pointing at me because I argue. That is not proof." A beat later: "I do not remember every minute. Do you?"`;
    }
    return `"I did not kill anyone," ${suspect.name} says too quickly. "You are fishing. ${suspect.statement.split(".").slice(0, 1).join(".")}." They glance away. "Come back when you have something real."`;
  }
  if (/alibi|where were you/.test(q)) {
    return `${suspect.name} meets your eyes. "I was clear about this: ${suspect.alibi}. I will say it again as many times as you need."`;
  }
  return `"${suspect.statement.split(".").slice(0, 2).join(".").trim()}." ${suspect.name} adds, "I am not your killer. Check the timeline before you ruin the wrong life."`;
}

export async function interrogateSuspect(opts: {
  suspect: InvestigationSuspect;
  draft: InvestigationCaseDraft;
  discoveredClues: string[];
  userMessage: string;
  prior: { role: "user" | "assistant"; content: string }[];
}): Promise<{ text: string; offline: boolean }> {
  const userMessage = sanitizePlayerText(opts.userMessage, 500);
  const system = buildSuspectSystemPrompt(opts);
  const messages = [
    { role: "system" as const, content: system },
    ...opts.prior.slice(-8).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const llm = await investigationChatCompletion({ messages, maxTokens: 200 });
  if (llm.ok) return { text: llm.text, offline: false };
  return { text: offlineSuspectReply(opts.suspect, userMessage), offline: true };
}

export function offlineAgentReply(agent: InvestigationFieldAgent): string {
  return `${agent.name} (${agent.role}): "Copy that. I will look into it — ${agent.specialty}. Ping me with a background check or alibi verify if you want the file pulled."`;
}

export async function chatWithAgent(opts: {
  agent: InvestigationFieldAgent;
  draft: InvestigationCaseDraft;
  discoveredClues: string[];
  userMessage: string;
}): Promise<{ text: string; offline: boolean }> {
  const userMessage = sanitizePlayerText(opts.userMessage, 500);
  const system = [
    `You are ${opts.agent.name}, ${opts.agent.role} (${opts.agent.specialty}).`,
    `Fictional case support only. Case: ${opts.draft.title}.`,
    "Reply in 1–2 short sentences, in character.",
    "Never reveal or guess the killer. Never invent evidence not in the case data.",
    "If you lack data, say you will look into it.",
    `Known clues so far:\n- ${opts.discoveredClues.join("\n- ") || "(none)"}`,
  ].join("\n");

  const llm = await investigationChatCompletion({
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
    maxTokens: 120,
    temperature: 0.5,
  });
  if (llm.ok) return { text: llm.text, offline: false };
  return { text: offlineAgentReply(opts.agent), offline: true };
}
