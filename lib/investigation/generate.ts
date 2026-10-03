import { randomBytes } from "node:crypto";
import { SAMPLE_INVESTIGATION_CASES } from "./sample-cases";
import { investigationChatCompletion, investigationLlmConfigured } from "./openai";
import { slugifyTitle } from "./sanitize";
import { validateInvestigationCase } from "./validate";
import {
  DEFAULT_FIELD_AGENTS,
  type InvestigationCaseDraft,
  type InvestigationSuspect,
} from "./types";

export type GenerateResult =
  | { ok: true; draft: InvestigationCaseDraft; source: "template" | "llm" }
  | { ok: false; error: string };

/** Pick / lightly vary an original template case (offline-safe). */
export function generateFromTemplates(seedHint?: string): InvestigationCaseDraft {
  const pool = SAMPLE_INVESTIGATION_CASES;
  const hint = (seedHint ?? "").toLowerCase();
  const base =
    pool.find((c) => c.title.toLowerCase().includes(hint) || c.slug.includes(hint)) ??
    pool[Math.floor(Math.random() * pool.length)]!;

  // Fresh slug so regenerated drafts do not collide when published as new.
  const suffix = randomBytes(3).toString("hex");
  const draft: InvestigationCaseDraft = structuredClone(base);
  draft.slug = `${base.slug}-${suffix}`;
  draft.fieldAgents = DEFAULT_FIELD_AGENTS;
  // Ensure validation still passes after clone.
  const v = validateInvestigationCase(draft);
  if (!v.ok) {
    // Fall back to first sample unchanged slug variant.
    const fallback = structuredClone(pool[0]!);
    fallback.slug = `${fallback.slug}-${suffix}`;
    return fallback;
  }
  return draft;
}

/**
 * AI-assisted original case generation.
 * Falls back to templates when LLM unavailable or output fails validation.
 */
export async function generateInvestigationCase(opts?: {
  prompt?: string;
  preferLlm?: boolean;
}): Promise<GenerateResult> {
  const prompt = (opts?.prompt ?? "").trim().slice(0, 400);

  if (opts?.preferLlm !== false && investigationLlmConfigured()) {
    const llm = await generateViaLlm(prompt);
    if (llm.ok) return llm;
  }

  const draft = generateFromTemplates(prompt);
  return { ok: true, draft, source: "template" };
}

async function generateViaLlm(prompt: string): Promise<GenerateResult> {
  const system = `You invent a brand-new fictional murder mystery case for a detective training game.
Hard rules:
- Entirely original. Never reuse Mentalist, Red John, Patrick Jane, Lisbon, CBI, smiley motifs, or any TV show case.
- Never use real people as suspects or the guilty party.
- Exactly one guilty suspect (isGuilty true).
- 3 to 5 suspects; 4 to 6 scenes (locations) each with a clue.
- Every suspect needs motive, background, alibi, statement, personality, role, evidenceTitle, evidenceDetail.
- Clues must make the solution deducible (≥2 clues support the guilty party / weapon / alibi break).
- Reply with ONLY compact JSON matching this shape:
{"title":"","teaser":"","victims":[""],"location":"","discoveryReport":"","weapon":{"name":"","trait":""},"locations":[{"id":"loc1","name":"","clue":""}],"suspects":[{"id":"s1","name":"","role":"","personality":"","motive":"","background":"","alibi":"","statement":"","isGuilty":false,"evidenceTitle":"","evidenceDetail":""}],"hasTwist":false,"twistNote":null}`;

  const user = prompt
    ? `Theme hint (optional, keep original): ${prompt}`
    : "Invent a coastal or urban locked-room style case with distinctive weapon trait.";

  const res = await investigationChatCompletion({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    maxTokens: 1200,
    temperature: 0.9,
  });

  if (!res.ok) return { ok: false, error: res.error };

  try {
    const jsonText = extractJsonObject(res.text);
    const parsed = JSON.parse(jsonText) as Partial<InvestigationCaseDraft>;
    const draft = normalizeLlmDraft(parsed);
    const v = validateInvestigationCase(draft);
    if (!v.ok) {
      return {
        ok: false,
        error: v.issues.map((i) => i.message).join("; "),
      };
    }
    return { ok: true, draft, source: "llm" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to parse LLM case JSON",
    };
  }
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in LLM response");
  return text.slice(start, end + 1);
}

function normalizeLlmDraft(
  parsed: Partial<InvestigationCaseDraft>,
): InvestigationCaseDraft {
  const title = String(parsed.title ?? "Untitled case").trim() || "Untitled case";
  const suspects = (parsed.suspects ?? []).map((s, i) =>
    normalizeSuspect(s as InvestigationSuspect, i),
  );
  // Enforce exactly one guilty if model messed up.
  const guiltyIdx = suspects.findIndex((s) => s.isGuilty);
  if (guiltyIdx < 0 && suspects.length) {
    suspects[0]!.isGuilty = true;
  } else if (guiltyIdx >= 0) {
    suspects.forEach((s, i) => {
      s.isGuilty = i === guiltyIdx;
    });
  }

  return {
    slug: slugifyTitle(title) || `case-${randomBytes(3).toString("hex")}`,
    title,
    teaser: String(parsed.teaser ?? "").trim(),
    victims: Array.isArray(parsed.victims)
      ? parsed.victims.map(String)
      : ["Unknown victim"],
    location: String(parsed.location ?? "").trim(),
    discoveryReport: String(parsed.discoveryReport ?? "").trim(),
    weapon: {
      name: String(parsed.weapon?.name ?? "Unknown weapon"),
      trait: String(parsed.weapon?.trait ?? "unmarked"),
    },
    locations: (parsed.locations ?? []).map((l, i) => ({
      id: String(l.id || `loc-${i + 1}`),
      name: String(l.name ?? `Scene ${i + 1}`),
      clue: String(l.clue ?? ""),
    })),
    suspects,
    hasTwist: Boolean(parsed.hasTwist),
    twistNote: parsed.twistNote ? String(parsed.twistNote) : null,
    darkerTheme: Boolean(parsed.darkerTheme),
    fieldAgents: DEFAULT_FIELD_AGENTS,
  };
}

function normalizeSuspect(s: InvestigationSuspect, i: number): InvestigationSuspect {
  return {
    id: String(s?.id || `s-${i + 1}`),
    name: String(s?.name ?? `Suspect ${i + 1}`),
    role: String(s?.role ?? "Person of interest"),
    personality: String(s?.personality ?? "Guarded"),
    motive: String(s?.motive ?? ""),
    background: String(s?.background ?? ""),
    alibi: String(s?.alibi ?? ""),
    statement: String(s?.statement ?? ""),
    isGuilty: Boolean(s?.isGuilty),
    evidenceTitle: String(s?.evidenceTitle ?? ""),
    evidenceDetail: String(s?.evidenceDetail ?? ""),
  };
}
