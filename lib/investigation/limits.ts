/** Investigation Mode rate / length budgets. */

export const INVESTIGATION_LIMITS = {
  llm: { limit: 30, windowMs: 10 * 60 * 1000 },
  generate: { limit: 10, windowMs: 60 * 60 * 1000 },
  accuse: { limit: 20, windowMs: 10 * 60 * 1000 },
  mutate: { limit: 120, windowMs: 10 * 60 * 1000 },
} as const;

export const INVESTIGATION_MAX = {
  chatMessage: 500,
  agentMessage: 400,
  displayName: 40,
  generatePrompt: 400,
} as const;
