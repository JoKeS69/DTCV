# Case research agent — architecture

## Databases

| DB | Env | Client | Writers |
| --- | --- | --- | --- |
| Main site | `DATABASE_URL` | `lib/db.ts` | Auth, community, sourced cases, **consent_log** |
| Cases research | `CASES_DATABASE_URL` | `lib/cases-db.ts` | `/pb-case`, research agent, trending, takedowns |

Research agent **must not** write to users/auth/settings tables.

## Providers

| Concern | Provider | Env |
| --- | --- | --- |
| LLM | **OpenAI** (official SDK `openai`) | `OPENAI_API_KEY` |
| Extract model | from env only | `OPENAI_MODEL_EXTRACT` |
| Verify model | from env only (strongest) | `OPENAI_MODEL_VERIFY` |
| Light model | trending scoring | `OPENAI_MODEL_LIGHT` |
| Search | **Brave Search API** | `BRAVE_API_KEY` |

Put real secrets only in **gitignored** `.env.local`. `.env.example` has placeholders.
Never hardcode, commit, or log API keys. Model names are **not** hardcoded in app code —
missing model env vars throw when a live key is used.

### Changing models

Edit `.env.local` (or host secrets):

```bash
OPENAI_MODEL_EXTRACT="gpt-4o-mini"
OPENAI_MODEL_VERIFY="gpt-4o"
OPENAI_MODEL_LIGHT="gpt-4o-mini"
```

Restart the server. No code change required.

### Structured outputs

Extract/verify use OpenAI JSON-schema structured outputs when available, then
**zod-validate** locally. Malformed payloads are rejected and retried (max 2).
429/timeouts use exponential backoff. Token usage is stored on `research_runs`
(`promptTokens`, `completionTokens`, `totalTokens`) for PB CASE cost visibility.

## Pipeline

`plan → search/fetch (allowlist + robots.txt) → extract → verify → corroborate → assemble draft → pending_review`

Limits: `RESEARCH_MAX_STEPS`, `RESEARCH_MAX_PAGES`, `RESEARCH_MAX_COST`, timeouts, retries.
Prompt-injection defense strips instruction-like payloads from fetched HTML.
Copyright: paraphrase + short excerpts + source links.
Social: official APIs only or skip (currently skip).

**Agent never publishes.** Publish is admin-only via publish gate.

## `/pb-case` features

Cases list/create · research + run monitor (incl. tokens) · claims review · people review · draft preview · publish/unpublish · labels (max 3 world_domination) · trending inbox · takedown queue · audit log.

Access: `ADMIN_USERNAME` (default `abed`) + `UserRole.ADMIN` → else **404**. noindex + robots Disallow.

## World Domination stubs (unpublished)

Confirmed decision: stubs remain **unpublished** until researched, approved, and
published by an admin.

1. Assassination of Rafic Hariri — 14 February 2005, Beirut  
2. September 11 attacks — 2001  
3. Assassination of John F. Kennedy — 1963  

Seed: `npm run db:cases:seed` — title + date only; no fabricated narrative.

## Legal safety

Naming policy · legal status display · presumption of innocence · wording linter · sources + last reviewed + takedown button · weekly re-verify flag cron stub · publish gate · audit log · 18+ interstitial · consent modal (Terms+Privacy) with version re-prompt.

`/legal/*` pages stay **DRAFT**. **Lawyer review required before public launch**
(see README + `docs/PRODUCTION.md` checklist).

## Cases DB deploy (`db:deploy:cases`)

Separate step **after** main migrate, **before** the new app version starts.
Never migrate on app boot. Use a **migration-only** credential
(`CASES_DATABASE_URL_MIGRATE`), not the research-agent restricted role.
Require a backup first (`BACKUP_OK=1`). Fail deploy on error.

```bash
# Local / operator
BACKUP_OK=1 CASES_DATABASE_URL_MIGRATE="postgresql://..." \
  npm run db:deploy:cases:safe
# or
BACKUP_OK=1 bash scripts/deploy-cases-db.sh
```

Example GitHub Actions workflow: `.github/workflows/deploy-cases-db.yml.example`.

## How to research / review / publish

1. Sign in as `abed` (ADMIN).
2. Open `/pb-case` → create or open a case.
3. **Run research** (requires `OPENAI_API_KEY` + model envs + `BRAVE_API_KEY` for live work; otherwise no-op adapters).
4. Review claims/people; mark disputed claims into the Disputed section.
5. Ensure sources present; fix wording linter errors.
6. **Publish** (gate enforced). Unpublish anytime.

Do not run research or publish in automated agents unless explicitly requested.
