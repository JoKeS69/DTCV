# DETECTIVE research worker (Python)

External case-research agent for DETECTIVE / CASE//NET.

## Security model

1. **Not on the public website.** No public HTTP API. DB poll only.
2. **Keys stay on the worker.** Only this process holds `OPENAI_API_KEY`. The Next.js site never calls OpenAI.
3. **Cases DB only (built-in SQLite file).** Shared file `data/detective_cases.db` — never the main auth/users DB. No Postgres password.
4. **Admin-on-command only.** `/pb-case` → **Run research** queues a row; this worker claims it. End-users cannot trigger the agent.

```
[/pb-case admin] --queue--> [SQLite: research_runs queued]
                                    ^
                                    | poll / claim / write
                            [Python research-worker]
                                    |
                            OpenAI + keyless Wikipedia discovery
```

## Pipeline

`plan → search/fetch → extract → verify → corroborate → assemble draft → pending_review`

- **Never publishes.** Publish remains admin-only in PB CASE.

## Setup (Windows CMD — simplest)

```bat
REM From repo root — create the SQLite DB once
set CASES_DATABASE_URL=file:./data/detective_cases.db
npx prisma migrate deploy --config prisma-cases.config.ts
npm run db:cases:seed

REM Worker
cd research-worker
py -3 -m venv .venv
.venv\Scripts\pip.exe install -e ".[dev]"
copy .env.example .env
notepad .env
REM set OPENAI_* only — CASES_DATABASE_URL already points at the SQLite file

.venv\Scripts\python.exe -m research_worker worker
```

macOS / Linux:

```bash
export CASES_DATABASE_URL="file:./data/detective_cases.db"
npx prisma migrate deploy --config prisma-cases.config.ts
npm run db:cases:seed

cd research-worker
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # fill OPENAI_*
python -m research_worker worker
```

## Env vars (worker only)

| Var | Purpose |
| --- | --- |
| `CASES_DATABASE_URL` | SQLite file URL, e.g. `file:./data/detective_cases.db` |
| `OPENAI_API_KEY` | OpenAI — worker secrets only |
| `OPENAI_MODEL_*` | Model names |
| `BRAVE_API_KEY` | Optional |
| `RESEARCH_MAX_*` | Hard limits |

No Postgres. No `pg8000` / `psycopg`. Uses Python **stdlib `sqlite3`**.

## Run

```bash
python -m research_worker worker
python -m research_worker run-once
python -m research_worker trending
```

## Tests

```bash
pytest
```
