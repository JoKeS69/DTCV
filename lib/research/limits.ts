/**
 * Research pipeline limits readable by the Next.js control plane.
 * LLM / search keys are NOT read here — those live on the Python worker only.
 */

export function getResearchLimits() {
  return {
    maxSteps: Number(process.env.RESEARCH_MAX_STEPS || 12),
    maxPages: Number(process.env.RESEARCH_MAX_PAGES || 20),
    maxCost: Number(process.env.RESEARCH_MAX_COST || 5),
    timeoutMs: Number(process.env.RESEARCH_TIMEOUT_MS || 60_000),
    schemaRetries: Math.min(2, Number(process.env.RESEARCH_SCHEMA_RETRIES || 2)),
    retries: Number(process.env.RESEARCH_RETRIES || 3),
  };
}
