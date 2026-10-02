/**
 * OpenAI model ids — names come from env only (never hardcoded).
 * Set in `.env.local` (gitignored); placeholders live in `.env.example`.
 */

export type OpenAiModelRole = "extract" | "verify" | "light";

const ENV_KEYS: Record<OpenAiModelRole, string> = {
  extract: "OPENAI_MODEL_EXTRACT",
  verify: "OPENAI_MODEL_VERIFY",
  light: "OPENAI_MODEL_LIGHT",
};

/** Read a required model name from env. Throws if unset/empty. */
export function requireOpenAiModel(role: OpenAiModelRole): string {
  const key = ENV_KEYS[role];
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `${key} is not set. Set the OpenAI model name in .env.local (see .env.example).`,
    );
  }
  return value;
}

export function getOpenAiApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

export function getBraveApiKey(): string | null {
  const key = process.env.BRAVE_API_KEY?.trim();
  return key || null;
}

export function openAiModelEnvKey(role: OpenAiModelRole): string {
  return ENV_KEYS[role];
}
