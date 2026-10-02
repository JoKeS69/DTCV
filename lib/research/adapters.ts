/**
 * OpenAI (official SDK) + Brave Search adapters for the case research agent.
 * Keys and model names from env only — never hardcode, commit, or log secrets.
 */

import OpenAI from "openai";
import {
  RetryableProviderError,
  withBackoff,
} from "@/lib/research/backoff";
import {
  EXTRACT_JSON_SCHEMA,
  TRENDING_SCORE_JSON_SCHEMA,
  VERIFY_JSON_SCHEMA,
} from "@/lib/research/json-schemas";
import {
  getBraveApiKey,
  getOpenAiApiKey,
  requireOpenAiModel,
  type OpenAiModelRole,
} from "@/lib/research/models";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type LlmCompleteResult = {
  content: string;
  usage: TokenUsage;
  model: string;
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
    /** Malformed JSON/schema retries for extract/verify (max 2). */
    schemaRetries: Math.min(2, Number(process.env.RESEARCH_SCHEMA_RETRIES || 2)),
    /** Network/429 retries. */
    retries: Number(process.env.RESEARCH_RETRIES || 3),
  };
}

export function emptyUsage(): TokenUsage {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

/** Rough cost units from tokens (for RESEARCH_MAX_COST budget). */
export function costUnitsFromTokens(usage: TokenUsage): number {
  // ~$ scale-free units: 1M tokens ≈ 1.0 unit baseline
  return usage.totalTokens / 1_000_000;
}

type SchemaMode = "extract" | "verify" | "trending_score" | "json_object";

function schemaFor(mode: SchemaMode) {
  if (mode === "extract") {
    return {
      type: "json_schema" as const,
      json_schema: {
        name: "case_extract",
        strict: true,
        schema: EXTRACT_JSON_SCHEMA,
      },
    };
  }
  if (mode === "verify") {
    return {
      type: "json_schema" as const,
      json_schema: {
        name: "case_verify",
        strict: true,
        schema: VERIFY_JSON_SCHEMA,
      },
    };
  }
  if (mode === "trending_score") {
    return {
      type: "json_schema" as const,
      json_schema: {
        name: "trending_score",
        strict: true,
        schema: TRENDING_SCORE_JSON_SCHEMA,
      },
    };
  }
  return { type: "json_object" as const };
}

function createOpenAiClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    // Never log the key; SDK uses header only.
    maxRetries: 0, // we own backoff
    timeout: getResearchLimits().timeoutMs,
  });
}

export type OpenAiResearchClient = {
  id: string;
  configured: boolean;
  complete(input: {
    role: OpenAiModelRole;
    messages: LlmMessage[];
    schemaMode: SchemaMode;
  }): Promise<LlmCompleteResult>;
};

/** No-op client when OPENAI_API_KEY unset — safe for CI/build. */
function createNoopOpenAiClient(): OpenAiResearchClient {
  return {
    id: "noop-openai",
    configured: false,
    async complete({ schemaMode }) {
      if (schemaMode === "trending_score") {
        return {
          content: JSON.stringify({ score: 0.5, rationale: "OPENAI_API_KEY not configured" }),
          usage: emptyUsage(),
          model: "noop",
        };
      }
      if (schemaMode === "verify") {
        return {
          content: JSON.stringify({
            summary: "",
            claims: [],
            people: [],
            sources: [],
            notes: "OPENAI_API_KEY not configured — verify skipped.",
          }),
          usage: emptyUsage(),
          model: "noop",
        };
      }
      return {
        content: JSON.stringify({
          summary: "",
          claims: [],
          people: [],
          sources: [],
        }),
        usage: emptyUsage(),
        model: "noop",
      };
    },
  };
}

export function createOpenAiClientAdapter(): OpenAiResearchClient {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return createNoopOpenAiClient();

  const client = createOpenAiClient(apiKey);
  const limits = getResearchLimits();

  return {
    id: "openai",
    configured: true,
    async complete({ role, messages, schemaMode }) {
      const model = requireOpenAiModel(role);
      return withBackoff(
        async () => {
          try {
            const completion = await client.chat.completions.create({
              model,
              temperature: 0.2,
              messages,
              response_format: schemaFor(schemaMode),
            });
            const content = completion.choices[0]?.message?.content ?? "";
            const usage: TokenUsage = {
              promptTokens: completion.usage?.prompt_tokens ?? 0,
              completionTokens: completion.usage?.completion_tokens ?? 0,
              totalTokens: completion.usage?.total_tokens ?? 0,
            };
            // Never include apiKey or full headers in errors/returns.
            return { content, usage, model };
          } catch (err) {
            const status =
              err && typeof err === "object" && "status" in err
                ? Number((err as { status?: number }).status)
                : undefined;
            const message =
              err instanceof Error
                ? err.message.replace(/sk-[a-zA-Z0-9._-]+/g, "[redacted]")
                : "openai_error";
            throw new RetryableProviderError(`OpenAI error: ${message.slice(0, 200)}`, {
              status,
              retryable:
                status === 429 ||
                status === 408 ||
                (status !== undefined && status >= 500) ||
                /timeout/i.test(message),
            });
          }
        },
        { retries: limits.retries },
      );
    },
  };
}

/** @deprecated Use createOpenAiClientAdapter — kept name for call-site clarity. */
export function createLlmAdapter(): OpenAiResearchClient {
  return createOpenAiClientAdapter();
}

export function createBraveSearchAdapter(): SearchAdapter {
  const apiKey = getBraveApiKey();
  if (!apiKey) {
    return {
      id: "noop-brave",
      async search() {
        return [];
      },
    };
  }

  const baseUrl =
    process.env.BRAVE_SEARCH_BASE_URL?.trim() ||
    "https://api.search.brave.com/res/v1/web/search";
  const limits = getResearchLimits();

  return {
    id: "brave-search",
    async search(query, limit = 5) {
      return withBackoff(
        async () => {
          const url = new URL(baseUrl);
          url.searchParams.set("q", query);
          url.searchParams.set("count", String(limit));
          let res: Response;
          try {
            res = await fetch(url, {
              headers: {
                Accept: "application/json",
                "X-Subscription-Token": apiKey,
              },
              signal: AbortSignal.timeout(limits.timeoutMs),
            });
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "brave_fetch_failed";
            throw new RetryableProviderError(`Brave search: ${message}`, {
              retryable: true,
            });
          }
          if (res.status === 429 || res.status >= 500) {
            throw new RetryableProviderError(`Brave search HTTP ${res.status}`, {
              status: res.status,
              retryable: true,
            });
          }
          if (!res.ok) return [];
          const data = (await res.json()) as {
            web?: {
              results?: {
                title?: string;
                url?: string;
                description?: string;
              }[];
            };
          };
          const rows = data.web?.results ?? [];
          return rows
            .filter((r) => r.url)
            .slice(0, limit)
            .map((r) => ({
              title: r.title ?? r.url!,
              url: r.url!,
              snippet: r.description,
            }));
        },
        { retries: limits.retries },
      );
    },
  };
}

/** Primary search adapter — Brave. */
export function createSearchAdapter(): SearchAdapter {
  return createBraveSearchAdapter();
}
