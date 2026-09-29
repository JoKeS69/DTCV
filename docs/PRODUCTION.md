# DETECTIVE — Production runbook (Phase 14)

**Do not auto-deploy.** This document prepares a manual Vercel + Postgres launch.

## Design lock status

| Asset | Status |
| --- | --- |
| `desktop.jpeg` / `mobileversion.jpeg` (user final mockups) | **Missing in cloud checkout** — blocker for pixel-exact match |
| Interim refs used | `/cursor/stores/self/media/design-refs/{dashboard,login,mobile}.jpg` with brand **DETECTIVE** |

Upload `desktop.jpeg` + `mobileversion.jpeg` into the repo root (or agent media) before claiming pixel-exact UI lock.

## Prerequisites

1. Postgres 15+ with a dedicated database (managed Neon/Supabase/RDS OK).
2. GitHub repo connected to Vercel (Next.js preset).
3. Domain DNS ready (A/CNAME → Vercel) — see Domain placeholders below.
4. Visa live gateway credentials when leaving `PAYMENTS_MODE=test`.

## Environment (Vercel → Settings → Environment Variables)

Copy from `.env.example`. **Required in production:**

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (pooled OK for Prisma adapter) |
| `AUTH_SECRET` | `openssl rand -base64 32` — never reuse .env.example |
| `AUTH_URL` | `https://YOUR_DOMAIN` |
| `NEXT_PUBLIC_SITE_URL` | Same public origin |
| `AUTH_EMAIL_PLACEHOLDER` | Must be `false` in production |
| `E2E_TEST` | Must be `0` / unset in production |
| `PAYMENTS_MODE` | `live` only when gateway ready; else keep `test` off public traffic |
| `PAYMENTS_WEBHOOK_SECRET` | Long random; **no placeholder strings** |
| `VISA_GATEWAY_*` | Required when `PAYMENTS_MODE=live` |

Optional placeholders (no-op until set):

| Variable | Purpose |
| --- | --- |
| `ERROR_MONITORING_DSN` | Error monitoring provider DSN |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | `true` to enable analytics stub |
| `NEXT_PUBLIC_ANALYTICS_WRITE_KEY` | Analytics key |
| `NEXT_PUBLIC_APP_DOMAIN` | Canonical hostname documentation |

## Database migrations

Migrations live under `prisma/migrations/`. Production apply:

```bash
npm ci
npx prisma migrate deploy
npm run db:seed          # optional — fictional FC-001/FC-002 only; NEVER real-crime seed
npm run db:spotcheck
```

Vercel `buildCommand` in `vercel.json` runs `prisma migrate deploy` before `next build`.

**Readiness checklist**

- [ ] Backup / PITR enabled on Postgres
- [ ] `prisma migrate deploy` succeeds against staging clone
- [ ] Seed passwords (`demo_detective`, `admin_ops`) **disabled or rotated** if seed runs outside local
- [ ] No `$queryRaw` in app code (Prisma parameterized only)

## Vercel deploy (manual)

```bash
# After env vars are set in the Vercel project:
vercel link
vercel --prod   # ONLY when an operator explicitly chooses to ship
```

Build locally first:

```bash
npm run lint
npm run build
npm run test:unit
```

## Domain placeholders

| Item | Example |
| --- | --- |
| Apex | `detective.example.com` |
| `AUTH_URL` / `NEXT_PUBLIC_SITE_URL` | `https://detective.example.com` |
| Webhook URL | `https://detective.example.com/api/payments/webhook` |
| DNS | CNAME → `cname.vercel-dns.com` (or Vercel A records) |

## Observability

- `lib/observability/monitoring.ts` — error monitoring **placeholder**
- `lib/observability/analytics.ts` — analytics **placeholder** (no PII)
- Wire real SDKs only after DSN/keys exist; keep CSP headers in mind

## Security (confirm Phase 12)

- [ ] `PAYMENTS_WEBHOOK_SECRET` set (fail-closed)
- [ ] `PAYMENTS_MODE=live` ⇒ no `dev_visa`
- [ ] `AUTH_EMAIL_PLACEHOLDER=false`
- [ ] Admin role from DB only
- [ ] Suspended users blocked on mutations
- [ ] Security headers present (`next.config.ts`)
- [ ] Solution never in public fictional queries

## Payments note

**Visa via provider abstraction — not Stripe.** Live mode requires `VISA_GATEWAY_*`.
