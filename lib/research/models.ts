/**
 * OpenAI model env key helpers (documentation / tests only).
 * Live model calls happen in research-worker/ (Python), not this Next.js process.
 */

export type OpenAiModelRole = "extract" | "verify" | "light";

const ENV_KEYS: Record<OpenAiModelRole, string> = {
  extract: "OPENAI_MODEL_EXTRACT",
  verify: "OPENAI_MODEL_VERIFY",
  light: "OPENAI_MODEL_LIGHT",
};

export function openAiModelEnvKey(role: OpenAiModelRole): string {
  return ENV_KEYS[role];
}

/** Web app must not require OpenAI — always null here by design. */
export function getOpenAiApiKeyFromWebApp(): null {
  return null;
}
