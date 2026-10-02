# DETECTIVE research worker (Python)

External case-research agent for DETECTIVE / CASE//NET.

## Security model (confirmed)

1. **Not on the public website.** This worker has **no public HTTP API**. It does not sit behind a public URL on the Next.js app. Prefer DB polling only.
2. **Keys stay on the worker.** Only this process holds `OPENAI_API_KEY`, `OPENAI_MODEL_*`, and `BRAVE_API_KEY`. The Next.js site never calls OpenAI and never exposes this worker.
3. **Cases DB only.** Connect with a **restricted Postgres role** (`sql/restricted_role.sql`) that can update `research_runs` / claims / people / case drafts as designed. It **cannot** touch the main auth/users DB.
4. **Admin-on-command only.** An admin in `/pb-case` clicks **Run research** → Next.js inserts a `research_runs` row with `status = queued`. This worker polls, claims, runs the pipeline, and writes results back. **End-users cannot trigger or talk to the agent.**

```
[/pb-case admin] --queue--> [cases DB: research_runs queued]
                                    ^
                                    | poll / claim / write
                            [Python research-worker]
                                    |
                            OpenAI + Brave (worker secrets)
```

## Pipeline

`plan → search/fetch (allowlist + robots.txt) → extract → verify → corroborate → assemble draft → pending_review`

- **Never publishes.** Publish remains admin-only in PB CASE.
- Token usage recorded on `research_runs`.
- Malformed structured outputs: reject + retry (max 2).
- 429/timeout: exponential backoff.
- Prompt-injection defenses on fetched HTML; `RESEARCH_MAX_STEPS` / `PAGES` / `COST` enforced.

## Setup

**Prerequisite:** this folder exists only on tip `de90d68+` / branch `cursor/case-research-agent-6548`. If `cd research-worker` fails, sync that tip first (see Windows section below).

### macOS / Linux

```bash
cd research-worker
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # fill secrets — never commit .env
```

### Windows (PowerShell)

Install [Python 3.11+](https://www.python.org/downloads/) and check **“Add python.exe to PATH”**. Close and reopen the terminal, then:

```powershell
# 1) Sync tip so research-worker/ exists (from your Portfolio / handoff clone root)
git fetch origin cursor/case-research-agent-6548
git checkout cursor/case-research-agent-6548
# or: git pull origin cursor/case-research-agent-6548

# 2) Confirm folder
dir research-worker

# 3) Create venv + install (use py launcher if `python` is missing)
cd research-worker
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
pip install -e ".[dev]"
Copy-Item .env.example .env

# 4) Edit .env (Notepad): CASES_DATABASE_URL, OPENAI_*, BRAVE_API_KEY
notepad .env

# 5) Run worker
python -m research_worker worker
```

Notes for CMD (not PowerShell): use `research-worker\.venv\Scripts\activate.bat` instead of `Activate.ps1`. There is no `source` or `cp` in CMD — use `Copy-Item` / `copy`.

If PowerShell blocks activation: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

Apply the restricted DB role (as migrate admin) using `sql/restricted_role.sql`.

## Run

```bash
# Long-running worker (production / local)
python -m research_worker worker

# Process at most one queued job (cron / smoke)
python -m research_worker run-once

# Trending candidates only (schedule on worker host — not Next.js LLM)
python -m research_worker trending
```

Docker (optional):

```bash
docker build -t detective-research-worker .
docker run --env-file .env --rm detective-research-worker worker
```

## Env vars (worker only)

| Var | Purpose |
| --- | --- |
| `CASES_DATABASE_URL` | Cases Postgres — restricted writer role |
| `OPENAI_API_KEY` | OpenAI — worker secrets only |
| `OPENAI_MODEL_EXTRACT` | Extract model name (env only) |
| `OPENAI_MODEL_VERIFY` | Verify model name (strongest) |
| `OPENAI_MODEL_LIGHT` | Trending scoring |
| `BRAVE_API_KEY` | Brave Search |
| `RESEARCH_MAX_STEPS` / `PAGES` / `COST` | Hard limits |
| `WORKER_POLL_INTERVAL_SEC` | Poll cadence |

See `.env.example`. Optional `RESEARCH_WORKER_TOKEN` is reserved for a **private** internal webhook if you ever add one — **not** required; prefer DB as source of truth. Do not expose it on the public site.

## Tests

```bash
pytest
```

Schema validation + allowlist/sanitize smoke tests do **not** call live OpenAI/Brave.

## What the web app needs

Next.js / PB CASE only needs `CASES_DATABASE_URL` (admin/UI role) to **queue** runs and **monitor** status from the DB. It does **not** need OpenAI or Brave keys for research.
