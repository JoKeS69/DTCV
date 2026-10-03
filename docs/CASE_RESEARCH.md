# Case research agent — architecture

## Security model (confirmed)

1. **Python research worker is not on the public website.** No public HTTP API is required for the agent. The worker **polls** the cases DB for `research_runs` with `status = queued` (created when an admin clicks Research in PB CASE), then writes results back. Do **not** put the worker behind a public URL on the web app.
2. **Only the worker holds** `OPENAI_API_KEY`. The Next.js site **never** calls OpenAI and **never** exposes the worker. **No search-engine API key is required** (Wikipedia / allowlisted discovery by default; Brave optional).
3. **Worker DB access:** cases DB only — built-in **SQLite file** (`file:./data/detective_cases.db`). Never the main auth/users DB.
4. **“On command”** = admin action in `/pb-case` inserts/queues a job in the DB; worker picks it up. **No end-user** can trigger or talk to the agent.

```
Admin (/pb-case) ──insert queued──► cases DB (research_runs)
                                         ▲
                                         │ poll / claim / write results
                                  Python research-worker
                                         │
                                  OpenAI + keyless Wikipedia discovery
```

## Databases

| DB | Env | Client | Writers |
| --- | --- | --- | --- |
| Main site | `DATABASE_URL` | `lib/db.ts` | Auth, community, sourced cases, **consent_log** |
| Cases research | `CASES_DATABASE_URL` (`file:./data/detective_cases.db`) | `lib/cases-db.ts` + worker `sqlite3` | `/pb-case` queues/monitors; **Python worker** runs pipeline |

Research agent **must not** write to users/auth/settings tables.

## Control plane vs worker

| Concern | Where | Notes |
| --- | --- | --- |
| Queue research | Next.js `/pb-case` | Creates `research_runs` `queued` only |
| Monitor status | Next.js PB CASE | Reads steps, pages, tokens, errors, URLs from DB |
| LLM + fetch + discovery | `research-worker/` | Holds OpenAI key; keyless Wikipedia search; polls DB; never publishes |
| Publish | Admin only in PB CASE | Publish gate — agent never publishes |

## Providers (worker)

| Concern | Provider | Env |
| --- | --- | --- |
| LLM | **OpenAI** (official Python SDK) | `OPENAI_API_KEY` (worker only) |
| Extract / verify / light models | from env only | `OPENAI_MODEL_*` |
| Search | **Keyless** Wikipedia OpenSearch (+ allowlisted DDG HTML) | none required |
| Search (optional) | Brave Search API | `BRAVE_API_KEY` optional |

Web app `.env.local` needs `CASES_DATABASE_URL=file:./data/detective_cases.db` for admin/UI — **not** OpenAI for research.
Worker secrets: see `research-worker/.env.example`. Cases DB is **SQLite** (stdlib `sqlite3` — no Postgres password).

**Site deps for cases DB:** `package.json` includes `@prisma/adapter-libsql` and `@libsql/client`. After pulling tip, always run `npm install` from the repo root or Next will fail with `Can't resolve '@prisma/adapter-libsql'`.

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

### Windows (CMD — your prompt looks like `C:\...>`)

```bat
REM From clone ROOT — first sync tip if research-worker is missing:
git fetch origin cursor/case-research-agent-6548
git checkout cursor/case-research-agent-6548
dir research-worker

cd research-worker
setup-windows.cmd
notepad .env
run-worker.cmd
```

If `dir research-worker` fails, apply the store bundle first. Do **not** run `pip install -e ".[dev]"` from the repo root (that error means wrong folder). Do **not** use `Copy-Item` in CMD — use `copy` or `setup-windows.cmd`.

### Windows (PowerShell)

```powershell
git fetch origin cursor/case-research-agent-6548
git checkout cursor/case-research-agent-6548
cd research-worker
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
notepad .env
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

Cases DB is a **SQLite file** (`file:./data/detective_cases.db`). From repo root:

```bash
export CASES_DATABASE_URL="file:./data/detective_cases.db"
npx prisma migrate deploy --config prisma-cases.config.ts
npm run db:cases:seed
```

On Windows CMD:

```bat
set CASES_DATABASE_URL=file:./data/detective_cases.db
npx prisma migrate deploy --config prisma-cases.config.ts
npm run db:cases:seed
```

Keep `data/*.db` out of git (gitignored). Back up the file before migrating in shared environments.

## How to research / review / publish

1. Sign in as `abed` (ADMIN).
2. Open `/pb-case` → create or open a case.
3. **Run research** → web app queues `research_runs` (`queued`). Start the Python worker so it polls and completes the run.
4. Review claims/people; mark disputed claims into the Disputed section.
5. Ensure sources present; fix wording linter errors.
6. **Publish** (gate enforced). Unpublish anytime.

Do not run live research against the network with real keys in automated agents unless explicitly requested. Do not publish cases in automated agents unless explicitly requested.
