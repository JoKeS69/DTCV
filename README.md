# DETECTIVE

Global detective investigation platform. Phased delivery — this repo currently
includes **Phase 0–11** (foundation through SEO + performance).

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
| `prisma/` | Schema & migrations |

## Deploy on Vercel

1. Import the GitHub repo in Vercel (Next.js preset).
2. Set `DATABASE_URL`, auth, and `PAYMENTS_*` / `VISA_GATEWAY_*` vars in Environment Variables.
3. Build command: `npm run build` (runs `prisma generate` via postinstall).

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

Seeded admin: `admin_ops` / `detective-admin-2026` (role `ADMIN`).

To promote an existing user manually:

```bash
npx prisma db execute --stdin <<< \
  "UPDATE \"User\" SET role = 'ADMIN' WHERE username = 'demo_detective';"
# or re-run: npm run db:seed
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
- `/profile` + `/detectives/[username]` — DETECTIVE # badge, XP bar, stats HUD, achievements, history
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

- `/cases` — paginated HUD list, search, type/status/country/year filters
- `/cases/[slug]` — detail with safety labels, sources, follow/save/share
- Seeded **DEV-*** stubs only for real-case rows (not real crimes). Fictional FC-001 remains separate.

## Database (Phase 3)

Full Prisma domain schema + fictional seed only:

```bash
npx prisma migrate dev
npm run db:seed        # FC-001 THE HOUSE AT 11:47 (fictional)
npm run db:spotcheck
```

Demo user: `demo_detective` / `detective-demo-2026`  
Admin user: `admin_ops` / `detective-admin-2026`  
No real-crime cases are seeded. `Solution` is server-only — do not expose to clients.

## Auth (Phase 2)

Auth.js (NextAuth v5) credentials provider + Prisma `User` model.
Passwords hashed with bcrypt. JWT sessions. Protected route: `/profile`.

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
