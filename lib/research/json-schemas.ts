/**
 * OpenAI structured-output JSON Schemas — reference copy for docs/tests.
 * Authoritative live schemas live in research-worker/research_worker/schema.py.
 * Next.js does not call OpenAI.
 */

export const EXTRACT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    claims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          disputed: { type: "boolean" },
          sources: { type: "array", items: { type: "string" } },
          confidence: { type: ["number", "null"] },
        },
        required: ["text", "disputed", "sources", "confidence"],
      },
    },
    people: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          legalStatus: {
            type: "string",
            enum: [
              "unidentified",
              "named_public_record",
              "person_of_interest",
              "charged",
              "convicted",
              "acquitted",
              "deceased",
              "other",
            ],
          },
          sources: { type: "array", items: { type: "string" } },
        },
        required: ["name", "role", "legalStatus", "sources"],
      },
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          url: { type: "string" },
          title: { type: ["string", "null"] },
          excerpt: { type: ["string", "null"] },
        },
        required: ["url", "title", "excerpt"],
      },
    },
  },
  required: ["summary", "claims", "people", "sources"],
} as const;

export const VERIFY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    claims: EXTRACT_JSON_SCHEMA.properties.claims,
    people: EXTRACT_JSON_SCHEMA.properties.people,
    sources: EXTRACT_JSON_SCHEMA.properties.sources,
    notes: { type: "string" },
  },
  required: ["summary", "claims", "people", "sources", "notes"],
} as const;

export const TRENDING_SCORE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "number" },
    rationale: { type: "string" },
  },
  required: ["score", "rationale"],
} as const;
