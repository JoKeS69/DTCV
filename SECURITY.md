# SECURITY — DETECTIVE / CASE//NET

**Audited tip:** `cursor/casenet-spacious-1dad` @ `be62aef`  
**Docs branch:** `cursor/security-architecture-1dad`  
**Status:** Architecture decisions + classification. **Breaking remediations require explicit approval** (see Conflicts).  
**Related:** `/cursor/stores/self/docs/threat-model.md`, `/cursor/stores/self/internal/security-gap-audit.md`

---

## 1. Goals

- Data minimization and compartmentalization
- Strong authentication (target: Argon2id + passkeys)
- Private DB networking; app-level AEAD for highly sensitive fields; KMS key separation
- Public vs internal identifiers; IDOR-resistant authz
- Logging hygiene; admin least privilege; backup integrity
- Visa payments (not Stripe) unless product decision changes
- Rate limits **without durable IP storage**
- Documented breach scenarios and retention

---

## 2. Data classification

| Class | Definition | Current examples in product |
| --- | --- | --- |
| **Public** | Intended for unauthenticated or world-readable surfaces | Published case metadata (`slug`, `caseCode`, title, status), public detective dossier (`username`, `badgeNumber`, rank/XP), published fictional case briefs |
| **Internal** | Staff/ops or cross-request correlation; not for public UI | `User.id` (cuid), moderation report rows, payment webhook event ids, admin analytics aggregates, unpublished case drafts |
| **Private** | Bound to account / session; disclose only to subject or staff with need | Email (today plaintext), display name, bio, followed/saved cases, investigation notes, board state, subscription status |
| **Highly Sensitive** | Credential or payment secrets; breach = account/payment takeover | Password hashes, reset/verify raw tokens (ephemeral), Auth.js JWT session secret, `AUTH_SECRET`, payment webhook HMAC secret, gateway credentials, card PAN/CVV (must never persist — currently handled in-memory for `dev_visa` confirm only) |

**Minimization rule:** Do not store Highly Sensitive payment instrument data. Prefer hosted Visa checkout / tokenization so PAN never touches app DB.

---

## 3. Current state (as implemented)

| Area | Implementation | Notes |
| --- | --- | --- |
| Passwords | **bcryptjs cost 12** (`lib/password.ts`) | Not Argon2id |
| Passkeys | None | No WebAuthn app code |
| Sessions | Auth.js **JWT** (`auth.config.ts`); no DB `Session` model | Defaults ~30d; httpOnly; role **not** in JWT |
| Email | Plaintext unique on `User` | Shown on signed-in profile only |
| Field encryption / KMS | **None** | No AEAD |
| Rate limits | In-memory; auth/webhook keyed by **IP from headers** | Community keyed by user id; no durable IP table — IP lives in process memory map keys |
| IDs | Internal cuid; public `username` + sequential `badgeNumber` | Badge is enumerable |
| Admin | `USER` / `MODERATOR` / `ADMIN`; admin UI = ADMIN only | Role from DB, not JWT |
| Payments | **Visa** (`dev_visa` / `visa_gateway`) | No Stripe provider |
| Headers | CSP, XFO, nosniff, referrer, permissions (`lib/security/headers.ts`) | CSP allows `'unsafe-inline'`/`'unsafe-eval'`; **no HSTS** |
| Uploads | None | `avatarUrl` string only |
| DB networking | App uses `DATABASE_URL` | Private VPC / no-public-IP is **infra**, not enforced in app |

---

## 4. Target architecture (recommended — needs approval where conflicting)

### 4.1 Authentication

1. **Argon2id** for password hashes (migrate with dual-verify / rehash-on-login).
2. **Passkeys (WebAuthn)** as primary or second factor; keep password as recovery fallback until adoption is high.
3. Prefer **server-side session store** (or short-lived access JWT + rotating refresh) over long-lived 30d JWT for high-risk accounts; keep **role/plan out of client-visible tokens** (already true for role).
4. Enforce `suspendedAt` on every privileged gate (partially done via `requireActiveUser`; close remaining gaps).

### 4.2 Encryption & keys

1. **Envelope encryption**: DEKs for field classes; KEKs in **cloud KMS** (never in repo / `.env` long-term).
2. **AEAD** (e.g. AES-256-GCM) for Private / Highly Sensitive columns at rest (email, future recovery codes, payment customer tokens if stored).
3. Separate keys by purpose: `auth`, `pii`, `payments`, `backups`.
4. App secrets (`AUTH_SECRET`, webhook HMAC) in secret manager; rotate with dual-acceptance windows.

### 4.3 Identifiers & IDOR

1. Keep opaque internal cuids for all mutations.
2. Replace or obscure sequential `badgeNumber` for public surfaces (random public detective id, or HMAC’d display id).
3. Continue authorize-by-ownership / staff role on every mutating action (board, checkout, soft-delete).

### 4.4 Rate limiting without IP storage

1. Prefer keys: **user id**, **session id**, or **HMAC(IP + day-salt)** with short TTL so raw IP is not retained.
2. Move limiter to Redis/Upstash with TTL eviction; never write raw IP to Postgres.
3. Keep `E2E_TEST` / `DISABLE_RATE_LIMIT` **non-production only** (already documented).

### 4.5 Payments

1. **Stay on Visa abstraction** (`visa_gateway` / hosted fields) per prior product preference.
2. Never persist PAN/CVV; webhook HMAC + idempotent `PaymentWebhookEvent`.
3. If a future prompt requires Stripe, treat as **product conflict** — do not dual-implement without approval.

### 4.6 Logging & retention

1. Never log passwords, tokens, PAN, full JWT, or `AUTH_SECRET`.
2. Dev auth links with raw tokens: keep gated by `allowDevAuthLinks()`; forbid in production (already).
3. Retention: webhook payloads minimize PII; purge completed checkout sessions after N days (policy TBD).

### 4.7 Admin least privilege

1. Split ADMIN into capabilities later: `cases:write`, `users:suspend`, `billing:read`, `moderation:*`.
2. Keep MODERATOR out of `/admin` case/user/billing surfaces (current).
3. Audit log for staff mutations (not yet implemented).

### 4.8 Backups & network

1. Encrypted backups; keys in KMS; tested restore.
2. Postgres not publicly routable; app → DB via private network / SSL.

---

## 5. Conflicts requiring approval (STOP)

These **conflict** with stated security requirements or prior product decisions. **Do not implement until approved.**

1. **bcrypt → Argon2id (+ optional passkeys)** — current auth stack is bcrypt-only; migration is breaking for hash format and possibly UX (passkey enrollment).
2. **Plaintext email vs AEAD-at-rest** — encrypting email breaks unique lookup / login-by-email unless blind indexes (HMAC) are added; schema + auth flow change.
3. **JWT long-lived sessions vs short server sessions** — switching session strategy is auth-breaking.
4. **IP-keyed rate limits vs “no IP storage”** — today IP is held in memory map keys; durable “no IP” design needs HMAC/salt or non-IP keys (behavioral change under proxy abuse).
5. **Sequential public `badgeNumber` vs non-enumerable public IDs** — changing public detective identity is product/UX breaking.
6. **KMS + field encryption** — new infra dependency and ops model; not additive-only.
7. **Payments: Visa (implemented + prior preference) vs any Stripe mandate** — keep Visa unless user explicitly switches.
8. **CSP `'unsafe-inline'`/`'unsafe-eval'` removal** — may break Next.js runtime unless nonces/hashes land carefully.

---

## 6. Safe additive hardening (may land without architecture approval)

- Document decisions (this file + threat model + gap audit) ✅
- Add HSTS when HTTPS is guaranteed in production
- Tighten production guards on `E2E_TEST` / `DISABLE_RATE_LIMIT`
- Extend `suspendedAt` checks on remaining `requireUser` paths
- Reduce CSP over time with nonces (careful rollout)
- Stop logging any residual sensitive fields if found
- Backup / VPC checklist in runbooks (`docs/PRODUCTION.md`)

---

## 7. Phased remediation plan

| Phase | Work | Approval? |
| --- | --- | --- |
| **S0** | Docs, threat model, gap matrix (this turn) | No |
| **S1** | Additive: HSTS, prod forbid rate-limit bypass, suspend checks, logging audit | No (additive) |
| **S2** | Argon2id dual-verify + rehash; optional passkey spike | **Yes** (conflict #1) |
| **S3** | Blind-index email + AEAD; KMS wiring | **Yes** (#2, #6) |
| **S4** | Session hardening (shorter TTL / server sessions) | **Yes** (#3) |
| **S5** | Rate limit without raw IP; Redis | **Yes** (#4) |
| **S6** | Public detective id redesign | **Yes** (#5) |
| **S7** | Admin capability split + audit log | Prefer yes (RBAC product) |
| **S8** | CSP nonce migration | Prefer yes (#8) |

---

## 8. Retention (draft policy — approve separately)

| Data | Retention |
| --- | --- |
| Password hashes | Until account delete + grace |
| Email / PII | Account lifetime; delete on account erasure request |
| Reset/verify token hashes | Until used or expiry (hours) |
| Checkout sessions | 30–90 days after terminal state |
| Webhook events | 90 days (idempotency), then purge/minimize |
| Rate-limit buckets | TTL = window only (memory/Redis) |
| Backups | Encrypted; retention window per ops (e.g. 30 days) |

---

## 9. Breach scenarios (summary)

See `threat-model.md` for full trees. Headline scenarios:

1. **DB dump** — password hashes offline-crackable (bcrypt-12 mitigates but Argon2id preferred); email plaintext exposed; no field AEAD.
2. **`AUTH_SECRET` leak** — forge JWTs until rotate; mitigate with rotation + shorter TTL.
3. **Webhook secret leak** — forged subscription grants; mitigate with rotation + anomaly alerts.
4. **Admin account takeover** — full content/user control; mitigate with passkeys + step-up + audit log.
5. **IDOR on investigation/checkout** — currently owner-checked; regression tests required.

---

## 10. Key location (target)

| Secret | Target location |
| --- | --- |
| `AUTH_SECRET` | Cloud secret manager |
| DB credentials | Secret manager; private network |
| Payment webhook HMAC | Secret manager; rotate |
| Visa gateway credentials | Secret manager |
| Field DEKs / KEKs | KMS (CMK) + envelope in app |
| Backup encryption keys | KMS; separate from app DEKs |

**Current:** secrets via environment variables (`.env*` gitignored except `.env.example`).

---

*Last updated: 2026-09-29 — audit-only turn; waiting on conflict approvals before S2+.*
