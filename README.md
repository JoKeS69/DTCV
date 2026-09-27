# Abed Ezmerli — portfolio

Next.js (App Router) site migrated from a single static `index.html`. Same layout, copy, and color system, with a real contact API and three clickable concept-product demos.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Contact form email (Resend)

Submissions POST to `/api/contact` and are sent with [Resend](https://resend.com).

1. Create a free Resend account.
2. Open **API Keys** → **Create API Key**. Copy the `re_…` value.
3. Paste it into `.env.local` as `RESEND_API_KEY`.
4. Set `CONTACT_EMAIL=abdedalrahman04ae@gmail.com` (already in `.env.example`).
5. Optional: `RESEND_FROM` — a verified sender. Until you verify a domain, Resend’s test sender is `Portfolio <onboarding@resend.dev>` and **mail only delivers to the email on your Resend account**. To receive at `abdedalrahman04ae@gmail.com`, either sign up Resend with that Gmail address or verify a domain and set `RESEND_FROM` to an address on that domain.
6. Restart `npm run dev`. Fill the contact form with a real message (10+ characters) and submit.
7. Check the inbox (and spam). You should see subject `New project inquiry from {name}` with Reply-To set to the visitor’s email.

Without `RESEND_API_KEY` or `CONTACT_EMAIL`, the API returns **500** with a configuration error — the success box on the site will not appear.

## Concept demos

| Route | What it proves |
| --- | --- |
| `/projects/ledger` | Sidebar dashboard, Recharts MRR/churn chart, billing table, admin vs member UI |
| `/projects/marlow` | Product grid, detail pages, cart (add/remove/qty, localStorage), demo checkout |
| `/projects/fieldwork` | Weekday calendar, staff slots, server-side double-booking rejection |

## Deploy on Vercel

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com).
2. Framework preset: Next.js (defaults are fine).
3. Environment variables (Production + Preview):
   - `RESEND_API_KEY`
   - `CONTACT_EMAIL` = `abdedalrahman04ae@gmail.com`
   - optional `RESEND_FROM`
   - optional `NEXT_PUBLIC_SITE_URL` = your live domain (sitemap / Open Graph)
4. Deploy. Test `/` contact form and the three `/projects/*` routes.

When you have public profiles, paste the URLs into `lib/site-config.ts` (`github`, `linkedin`, `upworkUrl`) — the footer and contact line pick them up automatically.

Rate limiting on `/api/contact` is in-memory per server instance (5 posts / 15 minutes / IP) plus a honeypot field named `website`. For a high-traffic site, replace it with Upstash Redis.
"# Portfolio" 
