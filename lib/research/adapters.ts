/**
 * Provider-agnostic LLM + search adapters for the case research agent.
 * Keys from env only — never commit secrets.
 */

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmAdapter = {
  id: string;
  complete(messages: LlmMessage[], opts?: { json?: boolean }): Promise<string>;
};

export type SearchHit = {
  title: string;
  url: string;
  snippet?: string;
};

export type SearchAdapter = {
  id: string;
  search(query: string, limit?: number): Promise<SearchHit[]>;
};

export function getResearchLimits() {
  return {
    maxSteps: Number(process.env.RESEARCH_MAX_STEPS || 12),
    maxPages: Number(process.env.RESEARCH_MAX_PAGES || 20),
    maxCost: Number(process.env.RESEARCH_MAX_COST || 5),
    timeoutMs: Number(process.env.RESEARCH_TIMEOUT_MS || 60_000),
    retries: Number(process.env.RESEARCH_RETRIES || 2),
  };
}

/** Stub/no-op LLM when LLM_API_KEY is unset — safe for CI/build. */
export function createLlmAdapter(): LlmAdapter {
  const apiKey = process.env.LLM_API_KEY?.trim();
  const model = process.env.LLM_MODEL?.trim() || "gpt-4o-mini";
  const baseUrl =
    process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1";

  if (!apiKey) {
    return {
      id: "noop-llm",
      async complete() {
        return JSON.stringify({
          note: "LLM_API_KEY not configured — research skipped.",
          claims: [],
          people: [],
          summary: "",
        });
      },
    };
  }

  return {
    id: `openai-compatible:${model}`,
    async complete(messages, opts) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          ...(opts?.json
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`LLM error ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content ?? "";
    },
  };
}

export function createSearchAdapter(): SearchAdapter {
  const apiKey = process.env.SEARCH_API_KEY?.trim();
  if (!apiKey) {
    return {
      id: "noop-search",
      async search() {
        return [];
      },
    };
  }

  // Generic provider-shaped search (Brave/Serp-like). Replace base as needed.
  const baseUrl =
    process.env.SEARCH_API_BASE_URL?.trim() ||
    "https://api.search.brave.com/res/v1/web/search";

  return {
    id: "http-search",
    async search(query, limit = 5) {
      const url = new URL(baseUrl);
      url.searchParams.set("q", query);
      url.searchParams.set("count", String(limit));
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        web?: { results?: { title?: string; url?: string; description?: string }[] };
        results?: { title?: string; url?: string; snippet?: string }[];
      };
      type HitRow = {
        title?: string;
        url?: string;
        description?: string;
        snippet?: string;
      };
      const rows: HitRow[] = (data.web?.results ?? data.results ?? []) as HitRow[];
      return rows
        .filter((r) => r.url)
        .slice(0, limit)
        .map((r) => ({
          title: r.title ?? r.url!,
          url: r.url!,
          snippet: r.description ?? r.snippet,
        }));
    },
  };
}
