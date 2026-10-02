# Case research agent — architecture

## Databases

| DB | Env | Client | Writers |
| --- | --- | --- | --- |
| Main site | `DATABASE_URL` | `lib/db.ts` | Auth, community, sourced cases, **consent_log** |
| Cases research | `CASES_DATABASE_URL` | `lib/cases-db.ts` | `/pb-case`, research agent, trending, takedowns |

Research agent **must not** write to users/auth/settings tables.

## Pipeline

`plan → search/fetch (allowlist + robots.txt) → extract (JSON schema) → verify (wording) → corroborate → assemble draft → pending_review`

Limits: `RESEARCH_MAX_STEPS`, `RESEARCH_MAX_PAGES`, `RESEARCH_MAX_COST`, timeouts, retries.
Prompt-injection defense strips instruction-like payloads from fetched HTML.
Copyright: paraphrase + short excerpts + source links.
Social: official APIs only or skip (currently skip).

**Agent never publishes.** Publish is admin-only via publish gate.

## `/pb-case` features

Cases list/create · research + run monitor · claims review · people review · draft preview · publish/unpublish · labels (max 3 world_domination) · trending inbox · takedown queue · audit log.

Access: `ADMIN_USERNAME` (default `abed`) + `UserRole.ADMIN` → else **404**. noindex + robots Disallow.

## World Domination stubs (unpublished)

1. Assassination of Rafic Hariri — 14 February 2005, Beirut  
2. September 11 attacks — 2001  
3. Assassination of John F. Kennedy — 1963  

Seed: `npm run db:cases:seed` — title + date only; no fabricated narrative.

## Legal safety

Naming policy · legal status display · presumption of innocence · wording linter · sources + last reviewed + takedown button · weekly re-verify flag cron stub · publish gate · audit log · 18+ interstitial · consent modal (Terms+Privacy) with version re-prompt.

## How to research / review / publish

1. Sign in as `abed` (ADMIN).
2. Open `/pb-case` → create or open a case.
3. **Run research** (requires `LLM_API_KEY` / `SEARCH_API_KEY` for live fetches; otherwise no-op adapters).
4. Review claims/people; mark disputed claims into the Disputed section.
5. Ensure sources present; fix wording linter errors.
6. **Publish** (gate enforced). Unpublish anytime.

Do not run research or publish in automated agents unless explicitly requested.
