# DETECTIVE

Global detective investigation platform. Phased delivery — this repo currently
includes **Phase 0–14** (foundation through production prep). **No auto-deploy.**

## Stack

- Next.js (App Router) · React · TypeScript (strict)
- Tailwind CSS · ESLint
- Prisma ORM · PostgreSQL
- Vercel-compatible

## Local setup

```bash
npm install
cp .env.example .env.local
# Set DATABASE_URL to a reachable Postgres instance when you need DB access
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run build` succeeds without a live database. Prisma Client is generated on
`postinstall` / `prisma generate`. Queries require `DATABASE_URL` at runtime.


## Data sources

Real cases (wanted + missing/unidentified) are ingested through adapters behind a common interface (`lib/sources`).

| Source | Status | Notes |
| --- | --- | --- |
| **FBI Wanted** | **Enabled (primary)** | `https://api.fbi.gov/wanted/v1/list` — no API key. Paginated hourly sync. Attribute FBI + link `sourceUrl`. |
| **NCMEC** | Disabled until creds | Poster API live-fetch only — **do not store poster content** in DB. Requires `NCMEC_CLIENT_ID` + `NCMEC_CLIENT_SECRET`, registration with NCMEC, and AI-use disclosure. Keep NCMEC notices; no ads beside content. |
| **INTERPOL** | **Removed** | Terms forbid reproducing wanted/missing data on other sites and bots/data mining without written permission. No adapter. |
| **NamUs** | Disabled stub | Permission required from `namus@usdoj.gov`. No scrape. `NAMUS_ENABLED=false`. |
| **Europol** | Manual import only | Admin CSV/JSON (`/admin/import`). No automated collection. |
| **CIA** | Not used | No case data; Factbook retired / irrelevant. |

Public terms page: [`/sources`](./app/sources/page.tsx).

### Manual sync

```bash
# Cron (Vercel hourly) — Authorization: Bearer $CRON_SECRET
curl -H "Authorization: Bearer $CRON_SECRET" "$NEXT_PUBLIC_SITE_URL/api/cron/sync-cases"

# Force one source
curl -H "Authorization: Bearer $CRON_SECRET" \
  "$NEXT_PUBLIC_SITE_URL/api/cron/sync-cases?force=1&source=fbi"

# Or Admin → Sync → Force sync
```

Admin overrides (hide/note) live in `CaseAdminOverride` and are never overwritten by sync.

## Folder map (production architecture)

| Path | Purpose |
| --- | --- |
| `app/(public)/` | Public pages (marketing / home) |
| `app/(auth)/` | Auth routes (Phase 2+) |
| `app/cases/` | Real-case surfaces (Phase 4+) |
| `app/fictional/` | Fictional investigation engine (Phase 6+) |
| `app/admin/` | Admin console (Phase 9+) |
| `app/api/` | Route handlers |
| `app/actions/` | Server Actions |
| `components/*` | UI by domain |
| `lib/db.ts` | Prisma client wiring |
| `lib/cases-db.ts` | Dedicated cases-research Prisma client |
| `prisma/` | Main site schema & migrations |
| `prisma-cases/` | Cases research DB schema, migrations, seed |
| `app/pb-case/` | Admin research desk (username `abed` only → else 404) |
| `app/research-cases/` | Published research case files (consent + 18+) |
| `app/legal/` | Terms, Privacy, Disclaimer, Copyright, AUP, Cookies |
| `lib/research/` | Control plane: queue research jobs (LLM runs in `research-worker/`) |
| `research-worker/` | External Python worker (OpenAI + Brave; polls cases DB) |

## Case research agent (`/pb-case` + `research-worker/`)

Dedicated **cases SQLite file** (`CASES_DATABASE_URL=file:./data/detective_cases.db`) separate from the main site DB.
The research agent writes only to the cases DB — never users/auth/settings.

### Security model (confirmed)

1. **Worker is not on the public website** — no public HTTP API; worker **polls** `research_runs` with `status=queued`.
2. **Only the worker holds** `OPENAI_API_KEY`. Next.js never calls OpenAI and never exposes the worker. **Search API key not required.**
3. **Worker DB:** cases SQLite file only — cannot touch main auth/users DB.
4. **Admin-on-command:** `/pb-case` queues a DB job; end-users cannot trigger or talk to the agent.

### Architecture

| Layer | Role |
| --- | --- |
| Next.js / PB CASE | Control plane: admin queues jobs, monitors run status from DB |
| `research-worker/` (Python) | Holds OpenAI key; keyless Wikipedia discovery; polls DB → `pending_review` |

### Providers (worker-only — see `research-worker/.env.example`)

- **LLM:** OpenAI official Python SDK — `OPENAI_API_KEY`
- **Models (env only):** `OPENAI_MODEL_EXTRACT`, `OPENAI_MODEL_VERIFY`, `OPENAI_MODEL_LIGHT`
- **Search:** keyless (Wikipedia + allowlisted DDG HTML); `BRAVE_API_KEY` optional

Web app needs `CASES_DATABASE_URL` for admin/UI — **not** OpenAI for research.

See [`.env.example`](./.env.example), [`docs/CASE_RESEARCH.md`](./docs/CASE_RESEARCH.md), and [`research-worker/README.md`](./research-worker/README.md).

```bash
# Generate both Prisma clients
npm run db:generate:all

# Main site migrate (Postgres), then cases SQLite file
npm run db:deploy
export CASES_DATABASE_URL="file:./data/detective_cases.db"
npx prisma migrate deploy --config prisma-cases.config.ts

# Seed three unpublished World Domination stubs (title+date only)
npm run db:cases:seed

# Start external research worker (separate process)
cd research-worker && pip install -e ".[dev]" && python -m research_worker worker
```

**Admin access:** NextAuth user with `role=ADMIN` **and** `username` matching
`ADMIN_USERNAME` (default `abed`). Everyone else gets **404**. Robots Disallow `/pb-case`.

**Workflow:** create/open case → **Run research** (queues DB job) → worker completes →
review claims/people → publish gate → Publish. Agent stops at `pending_review` and
**never** publishes. Token usage is recorded per research run.

**World Domination:** max 3 cases (DB + UI). Homepage/deck section lists published WD
cases only. **Seed stubs stay unpublished** until researched, approved, and published
by an admin.

**Trending:** schedule `python -m research_worker trending` on the **worker host**.
The Next.js `/api/cron/trending-discovery` route is a no-LLM stub (defers to worker).
**Re-verify stub:** `GET /api/cron/reverify-flags` (DB-only flags).

**Legal:** Footer links under `/legal/*` (**DRAFT** lawyer banner + placeholders).
**Lawyer review required before public launch.** First-visit consent modal before
research case pages; `consent_log` lives in the **main** DB. No UGC/comments/tip forms.

**Env — web app:** `CASES_DATABASE_URL`, `CASES_DATABASE_URL_MIGRATE`, `ADMIN_USERNAME`,
`ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, optional display-only `RESEARCH_MAX_*`.

**Env — worker only:** `OPENAI_API_KEY`, `OPENAI_MODEL_*`, optional `BRAVE_API_KEY`,
`CASES_DATABASE_URL` (restricted role), `RESEARCH_MAX_STEPS` / `PAGES` / `COST`.

### Cases DB CI/CD (`db:deploy:cases`)

Separate step **after** main migrate, **before** traffic hits the new app version:

1. Backup / PITR snapshot the cases Postgres DB.
2. Run migrate with a **migration-only** credential (`CASES_DATABASE_URL_MIGRATE`) —
   not the research-agent restricted role.
3. Use deploy-mode only (`prisma migrate deploy` via `scripts/deploy-cases-db.sh`).
4. Never migrate on app boot. Fail the pipeline if migrate errors.
5. Example workflow: [`.github/workflows/deploy-cases-db.yml.example`](./.github/workflows/deploy-cases-db.yml.example).

```bash
BACKUP_OK=1 bash scripts/deploy-cases-db.sh
```

## Production prep (Phase 14)

Full runbook: [`docs/PRODUCTION.md`](./docs/PRODUCTION.md) · design lock: [`docs/DESIGN_LOCK.md`](./docs/DESIGN_LOCK.md)

```bash
npm run lint && npm run build
npm run db:deploy          # prisma migrate deploy (staging/prod main DB)
BACKUP_OK=1 npm run db:deploy:cases:safe   # cases DB — after backup
npm run db:prod-check      # connectivity + counts
```

**Launch checklist (legal):**

- [ ] **Lawyer review of `/legal/*` DRAFT pages before public launch**
- [ ] Replace placeholders `[COMPANY/OWNER NAME]`, `[CONTACT EMAIL]`, `[GOVERNING LAW/JURISDICTION]`

- `vercel.json` — Vercel framework + migrate-on-build (manual promote only)
- Observability placeholders: `lib/observability/{monitoring,analytics}.ts`
- **Design blocker:** upload `desktop.jpeg` + `mobileversion.jpeg` for pixel-exact UI; interim chrome locked to `design-refs/*.jpg` with brand DETECTIVE

### Deploy on Vercel (manual only — do not auto-ship)

1. Import the GitHub repo in Vercel (Next.js preset).
2. Set env vars from `.env.example` (production values — see runbook).
3. Build: `prisma generate && prisma migrate deploy && next build` (see `vercel.json`).
4. Promote to production only when an operator explicitly chooses to.

## Testing (Phase 13)

```bash
npm run test:unit    # Vitest — authz, Visa, scoring, webhooks, labels
npm run test:e2e     # Playwright — auth, cases, community, fictional, Visa
npm run test:all     # unit + e2e (dev server on :3000 or auto-started)
npm run test:e2e:legacy  # prior phase smoke scripts
```

Set `E2E_TEST=1` in `.env.local` so auth rate limits do not trip during e2e.

## Security (Phase 12)

- Server-side RBAC / premium / suspend checks (`lib/server/authz.ts`, admin DB role)
- Auth rate limits; reset/verify tokens never returned outside local email placeholder
- Visa webhook: required HMAC secret (no default), transactional idempotency, IP rate limit
- `dev_visa` forbidden when `PAYMENTS_MODE=live`; test PANs only for Pro grant
- Security headers (CSP, frame deny, nosniff, referrer, permissions)
- Fictional `Solution` reveal gated on submission; JSON-LD escaped

## SEO + performance (Phase 11)

- Public metadata: title, description, canonical, Open Graph, Twitter cards
- `app/sitemap.ts` + `app/robots.ts` (blocks `/admin`, `/billing`, `/checkout`, `/profile`, `/api`)
- JSON-LD on home + real case detail (no private user fields)
- Default OG art via `app/opengraph-image.tsx`
- Case list cached (`unstable_cache`, 60s) with `cases-public` tag invalidation
- Case + fictional listings paginated (`CASE_PAGE_SIZE=20`, `FICTIONAL_PAGE_SIZE=12`)
- Fonts: `display: "swap"`, preload; route `loading.tsx` for cases/fictional

## Payments — Visa (Phase 10)

Provider abstraction (not Stripe-shaped):

| Mode | Behavior |
| --- | --- |
| `PAYMENTS_MODE=test` (default) | Local Visa checkout via `dev_visa`; HMAC webhook applies entitlements |
| `PAYMENTS_MODE=live` | Requires `VISA_GATEWAY_*` CyberSource-shaped credentials |

| Route | Purpose |
| --- | --- |
| `/pricing` | FREE vs Investigator Pro (amounts from env) |
| `/checkout/[sessionId]` | Visa card capture (test) / gateway handoff |
| `/billing` | Manage / cancel subscription (customer portal) |
| `/api/payments/webhook` | Signed webhook (`x-detective-signature`) |
| `/fictional/challenges` | Premium challenges bay |

Premium gates: ADVANCED/EXPERT fictional files, advanced stats, challenges. Free core (NOVICE/INTERMEDIATE, real cases, community) stays open.

Test Visa PANs: `4111111111111111` (success), `4000000000000002` (decline).

## Admin command deck (Phase 9)

Server-side **ADMIN-only** gate on every `/admin/*` route (`requireAdmin` /
`requireAdminAction`). Never trust client role claims.

| Route | Purpose |
| --- | --- |
| `/admin` | Overview counters + subscription snapshot |
| `/admin/users` | List, suspend/unsuspend, promote roles |
| `/admin/cases` | Create/edit real cases, publish, feature, sources |
| `/admin/fictional` | Create/edit/publish fictional training cases |
| `/admin/sources` | Cross-case citation management |
| `/admin/moderation` | Reports, discussion lock/hide, soft-delete comments |
| `/admin/subscriptions` | Live plan/status + payment customer/subscription ids |
| `/admin/analytics` | Light ops counters |

Local/CI admin (from `npm run db:seed:dev` only): `admin_ops` / `detective-admin-2026` (role `ADMIN`).

To promote an existing user manually:

```bash
npx prisma db execute --stdin <<< \
  "UPDATE \"User\" SET role = 'ADMIN' WHERE username = 'YOUR_USERNAME';"
```

## Investigation board (Phase 8)

- `/fictional/[slug]/board` — pin suspects/evidence/events/notes/custom nodes
- Drag to move (pointer events, no heavy canvas lib); Link mode to connect
- Persist positions (`InvestigationBoardNode`) + connections (`InvestigationConnection`)
- Desktop-first; mobile scroll + touch drag + Link-mode taps
- Awards `BOARD_BUILDER` at 5+ connections

## Detective profile / XP (Phase 7)

- Ranks: Recruit → Observer → Investigator → Detective → Senior Detective → Master Detective
- XP from fictional completions + achievements only (never real-case accusations)
- `/profile` + `/detectives/[username]` — opaque DET-* badge, XP bar, stats HUD, achievements, history
- `/fictional/rankings` — minimal fictional XP leaderboard

## Fictional ops (Phase 6)

- `/fictional` — published training cases (FC-001 seeded)
- `/fictional/[slug]` — brief, suspects, evidence, witnesses, timeline, notes, submit theory
- `/fictional/[slug]/result` — scorecard after submit (solution debrief unlocked only then)
- Server-side scoring only (40/20/15/15/10). `Solution` never sent to the client before submit.
- Investigation start/continue + notes persistence. Clearly marked **FICTIONAL**.

## Community (Phase 5)

- Case Discussion section: create/list threads (auth + rate limit)
- `/discussions/[id]` — comments, replies, likes, follow, report, soft-delete
- `/detectives/[username]` — public detective profile (linked from discussions)
- Posts labeled **USER THEORY** by default; reports create `Report` records
- Full moderation queue lives under `/admin/moderation` (Phase 9, ADMIN only)

## Case database (Phase 4)

- `/cases` — command-deck HUD list from published Prisma cases (empty until a real source is connected)
- `/cases/[slug]` — detail with safety labels, sources, follow/save/share
- **No fabricated real crimes** in production seed. Dev-only `DEV-*` stubs via `npm run db:seed:dev` (hidden from public list).
- Fictional FC-001 remains a separate training product surface.

## Database (Phase 3)

Full Prisma domain schema:

```bash
npx prisma migrate dev
npm run db:seed          # production-safe: achievements only
npm run db:seed:dev      # LOCAL/CI: demo users + FC-001/FC-002 + DEV stubs
npm run db:spotcheck     # expects db:seed:dev
```

Local demo user (`db:seed:dev`): `demo_detective` / `detective-demo-2026`  
Local admin (`db:seed:dev`): `admin_ops` / `detective-admin-2026`  
Production seed never fabricates real crimes. `Solution` is server-only.

## Auth (Phase 2)

Auth.js (NextAuth v5) credentials provider + Prisma `User` model.
Passwords hashed with Argon2id (legacy bcrypt verified + rehashed). Short JWT sessions. Protected route: `/profile`.

```bash
cp .env.example .env.local
# set DATABASE_URL, AUTH_SECRET, AUTH_URL
npx prisma migrate dev
npm run dev
```

Routes: `/login`, `/register`, `/reset-password`, `/verify-email`, `/profile`.
Email delivery is a **placeholder** when no provider is configured — reset/verify
links are shown in the UI for development.

## Design

Brand: **DETECTIVE** — dark cinematic investigative HUD (not CASE//NET).
Tokens and theme: `app/globals.css`, `lib/design-tokens.ts`.
Shared UI: `components/ui/*`. Layout chrome: `components/layout/*`.
Homepage sections: `components/home/*`. Auth HUD: `components/auth/*`.
