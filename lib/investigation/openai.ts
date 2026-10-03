/**
 * Optional OpenAI client for Investigation Mode only.
 * Uses INVESTIGATION_OPENAI_API_KEY (or OPENAI_API_KEY) — server env only.
 * If unset / failing → callers must use offline fallback.
 */

export type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

export function investigationLlmConfigured(): boolean {
  return Boolean(getInvestigationApiKey());
}

function getInvestigationApiKey(): string | null {
  const key =
    process.env.INVESTIGATION_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    "";
  return key || null;
}

function getModel(): string {
  return (
    process.env.INVESTIGATION_OPENAI_MODEL?.trim() ||
    process.env.OPENAI_MODEL_LIGHT?.trim() ||
    "gpt-4o-mini"
  );
}

export async function investigationChatCompletion(opts: {
  messages: ChatTurn[];
  maxTokens?: number;
  temperature?: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const key = getInvestigationApiKey();
  if (!key) {
    return { ok: false, error: "LLM offline — no investigation API key configured" };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getModel(),
        messages: opts.messages,
        max_tokens: opts.maxTokens ?? 220,
        temperature: opts.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `LLM HTTP ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`,
      };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, error: "LLM returned empty content" };
    return { ok: true, text };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "LLM request failed",
    };
  }
}
