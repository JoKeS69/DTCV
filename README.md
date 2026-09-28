# DETECTIVE

Global detective investigation platform. Phased delivery — this repo currently
includes **Phase 0–5** (foundation, visual, auth, database, real-case UI, community).

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
2. Set `DATABASE_URL` (and later auth/Stripe vars) in Environment Variables.
3. Build command: `npm run build` (runs `prisma generate` via postinstall).

## Community (Phase 5)

- Case Discussion section: create/list threads (auth + rate limit)
- `/discussions/[id]` — comments, replies, likes, follow, report, soft-delete
- `/detectives/[username]` — public detective profile (linked from discussions)
- `/admin/moderation` — minimal staff report/status queue (Phase 9 placeholder)
- Posts labeled **USER THEORY** by default; reports create `Report` records

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
