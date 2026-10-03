import type { InvestigationSuspect } from "./types";

export type AgentCommand =
  | { kind: "background_check"; suspectQuery: string }
  | { kind: "verify_alibi"; suspectQuery: string }
  | { kind: "unknown"; raw: string };

const BACKGROUND_RE =
  /\b(?:background\s*check|run\s+background|bg\s*check)\s*(?:on|for)?\s*(.+)$/i;
const ALIBI_RE =
  /\b(?:verify\s+alibi|check\s+alibi|alibi\s+check)\s*(?:of|for|on)?\s*(.+)$/i;

/** Deterministic parser for field-agent quick commands (no LLM). */
export function parseAgentCommand(raw: string): AgentCommand {
  const text = raw.trim();
  if (!text) return { kind: "unknown", raw: text };

  const bg = text.match(BACKGROUND_RE);
  if (bg?.[1]) {
    return { kind: "background_check", suspectQuery: bg[1].trim() };
  }
  const alibi = text.match(ALIBI_RE);
  if (alibi?.[1]) {
    return { kind: "verify_alibi", suspectQuery: alibi[1].trim() };
  }
  return { kind: "unknown", raw: text };
}

/** Fuzzy-match a suspect by name / first name / role. */
export function fuzzyMatchSuspect(
  query: string,
  suspects: InvestigationSuspect[],
): InvestigationSuspect | null {
  const q = query.trim().toLowerCase().replace(/[^\w\s]/g, "");
  if (!q) return null;

  const scored = suspects.map((s) => {
    const name = s.name.toLowerCase();
    const first = name.split(/\s+/)[0] ?? "";
    const role = s.role.toLowerCase();
    let score = 0;
    if (name === q || first === q) score = 100;
    else if (name.includes(q) || q.includes(name)) score = 80;
    else if (first.startsWith(q) || q.startsWith(first)) score = 60;
    else if (role.includes(q)) score = 40;
    else {
      // token overlap
      const qt = new Set(q.split(/\s+/).filter(Boolean));
      const nt = name.split(/\s+/);
      const overlap = nt.filter((t) => qt.has(t)).length;
      score = overlap * 25;
    }
    return { s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 40) return null;
  return best.s;
}

export function formatBackgroundReply(suspect: InvestigationSuspect): string {
  return `${suspect.name} — ${suspect.role}. Background: ${suspect.background} Possible motive on file: ${suspect.motive}`;
}

export function formatAlibiReply(suspect: InvestigationSuspect): string {
  return `${suspect.name} claims: ${suspect.alibi}`;
}

export function formatUnknownAgentReply(): string {
  return "I'll look into it — try “background check on <name>” or “verify alibi of <name>”.";
}
