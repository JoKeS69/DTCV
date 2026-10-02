# Case research agent — architecture

## Security model (confirmed)

1. **Python research worker is not on the public website.** No public HTTP API is required for the agent. The worker **polls** the cases DB for `research_runs` with `status = queued` (created when an admin clicks Research in PB CASE), then writes results back. Do **not** put the worker behind a public URL on the web app.
2. **Only the worker holds** `OPENAI_API_KEY` / Brave keys. The Next.js site **never** calls OpenAI and **never** exposes the worker.
3. **Worker DB access:** cases DB only, restricted role (`research-worker/sql/restricted_role.sql`) that can update `research_runs` / claims / people / case drafts as designed — **cannot** touch the main auth/users DB.
4. **“On command”** = admin action in `/pb-case` inserts/queues a job in the DB; worker picks it up. **No end-user** can trigger or talk to the agent.

```
Admin (/pb-case) ──insert queued──► cases DB (research_runs)
                                         ▲
                                         │ poll / claim / write results
                                  Python research-worker
                                         │
                                  OpenAI + Brave (worker secrets only)
```

## Databases

| DB | Env | Client | Writers |
| --- | --- | --- | --- |
| Main site | `DATABASE_URL` | `lib/db.ts` | Auth, community, sourced cases, **consent_log** |
| Cases research | `CASES_DATABASE_URL` | `lib/cases-db.ts` (web UI) + worker psycopg | `/pb-case` queues/monitors; **Python worker** runs pipeline |

Research agent **must not** write to users/auth/settings tables.

## Control plane vs worker

| Concern | Where | Notes |
| --- | --- | --- |
| Queue research | Next.js `/pb-case` | Creates `research_runs` `queued` only |
| Monitor status | Next.js PB CASE | Reads steps, pages, tokens, errors, URLs from DB |
| LLM + Brave + fetch | `research-worker/` | Holds keys; polls DB; never publishes |
| Publish | Admin only in PB CASE | Publish gate — agent never publishes |

## Providers (worker-only)

| Concern | Provider | Env (on **worker** host / secrets manager) |
| --- | --- | --- |
| LLM | **OpenAI** (official Python SDK) | `OPENAI_API_KEY` |
| Extract model | from env only | `OPENAI_MODEL_EXTRACT` |
| Verify model | from env only (strongest) | `OPENAI_MODEL_VERIFY` |
| Light model | trending scoring | `OPENAI_MODEL_LIGHT` |
| Search | **Brave Search API** | `BRAVE_API_KEY` |

Web app `.env.local` needs `CASES_DATABASE_URL` for admin/UI — **not** OpenAI/Brave for research.
Worker secrets: see `research-worker/.env.example`. Never hardcode, commit, or log API keys.

### Changing models

Edit the **worker** env (or secrets manager):

```bash
OPENAI_MODEL_EXTRACT="gpt-4o-mini"
OPENAI_MODEL_VERIFY="gpt-4o"
OPENAI_MODEL_LIGHT="gpt-4o-mini"
```

Restart the worker. No Next.js code change required.

### Structured outputs

Extract/verify use OpenAI JSON-schema structured outputs when available, then
**Pydantic-validate** on the worker. Malformed payloads are rejected and retried (max 2).
429/timeouts use exponential backoff. Token usage is stored on `research_runs`
(`promptTokens`, `completionTokens`, `totalTokens`) for PB CASE cost visibility.

## Pipeline

`plan → search/fetch (allowlist + robots.txt) → extract → verify → corroborate → assemble draft → pending_review`

Limits: `RESEARCH_MAX_STEPS`, `RESEARCH_MAX_PAGES`, `RESEARCH_MAX_COST`, timeouts, retries.
Prompt-injection defense strips instruction-like payloads from fetched HTML.
Copyright: paraphrase + short excerpts + source links.
Social: official APIs only or skip (currently skip).

**Agent never publishes.** Publish is admin-only via publish gate.

## How to start the Python worker

**Folder only exists after syncing tip `de90d68+`** (`cursor/case-research-agent-6548`). An older laptop handoff will not have `research-worker/` until you pull/checkout that tip (or apply the store bundle).

### macOS / Linux

```bash
cd research-worker
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # set CASES_DATABASE_URL + OpenAI + Brave
python -m research_worker worker
```

### Windows (PowerShell)

```powershell
git fetch origin cursor/case-research-agent-6548
git checkout cursor/case-research-agent-6548
cd research-worker
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
notepad .env   # fill secrets
python -m research_worker worker
```

Install Python 3.11+ from python.org with **Add to PATH**. Do not use `source` / `cp` in CMD — those are Unix commands.

Restricted role SQL: `research-worker/sql/restricted_role.sql`.
Full worker docs: [`research-worker/README.md`](../research-worker/README.md).

## `/pb-case` features

Cases list/create · **queue** research + run monitor (incl. tokens) · claims review · people review · draft preview · publish/unpublish · labels (max 3 world_domination) · trending inbox · takedown queue · audit log.

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
(`CASES_DATABASE_URL_MIGRATE`), not the research-worker restricted role.
Require a backup first (`BACKUP_OK=1`). Fail deploy on error.

```bash
BACKUP_OK=1 CASES_DATABASE_URL_MIGRATE="postgresql://..." \
  npm run db:deploy:cases:safe
```

Example GitHub Actions workflow: `.github/workflows/deploy-cases-db.yml.example`.

## How to research / review / publish

1. Sign in as `abed` (ADMIN).
2. Open `/pb-case` → create or open a case.
3. **Run research** → web app queues `research_runs` (`queued`). Start the Python worker so it polls and completes the run.
4. Review claims/people; mark disputed claims into the Disputed section.
5. Ensure sources present; fix wording linter errors.
6. **Publish** (gate enforced). Unpublish anytime.

Do not run live research against the network with real keys in automated agents unless explicitly requested. Do not publish cases in automated agents unless explicitly requested.
