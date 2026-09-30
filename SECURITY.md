# SECURITY — DETECTIVE / CASE//NET

**Remediation tip:** `cursor/security-remediation-1dad`  
**Prior audit tip:** `cursor/casenet-spacious-1dad` @ `be62aef`  
**Status:** Conflicts **1–6 and 8 APPROVED** (2026-09-29) and implemented (S1 + S2). **Conflict #7 KEEP VISA** — do not add Stripe.  
**Related:** `/cursor/stores/self/docs/threat-model.md`, `/cursor/stores/self/internal/security-gap-audit.md`

---

## 1. Goals

- Data minimization and compartmentalization
- Strong authentication: **Argon2id** (passkeys scaffolded, not wired)
- Private DB networking; app-level AEAD for highly sensitive fields; KMS key separation interface
- Public vs internal identifiers; IDOR-resistant authz
- Logging hygiene; admin least privilege; backup integrity
- **Visa payments only** (not Stripe)
- Rate limits **without durable IP storage**
- Documented breach scenarios and retention

---

## 2. Data classification

| Class | Definition | Examples (post-remediation) |
| --- | --- | --- |
| **Public** | World-readable / intentional public UI | Published cases; public dossier (`username`, opaque `publicId` DET-*, rank/XP) |
| **Internal** | Ops / correlation | `User.id` cuid, sequential `badgeNumber` (never public), reports, webhook event ids |
| **Private** | Account-bound | Email (AEAD ciphertext + blind index), bio, follows, investigations, boards, subscription status; private notes (AEAD) |
| **Highly Sensitive** | Credential / payment secret | Argon2id password hashes, raw auth tokens, `AUTH_SECRET`, webhook HMAC, gateway creds, PAN/CVV (must not persist) |

---

## 3. Implementation snapshot (remediated)

| Area | Implementation |
| --- | --- |
| Passwords | **Argon2id** (`@node-rs/argon2`); legacy bcrypt verified + rehashed on login |
| Passkeys | Scaffold only (`lib/auth/passkeys.ts`) — not UI-wired |
| Sessions | Auth.js JWT **8h** maxAge; `sessionVersion` bump invalidates on password change; HttpOnly + SameSite; Secure in production; email stripped from session |
| Email | AES-256-GCM (`emailEncrypted`) + HMAC blind index; plaintext column nullable/legacy; never returned on public APIs |
| Field encryption | `lib/crypto/*` + `ENCRYPTION_KEY` / `EMAIL_BLIND_INDEX_KEY`; `envKmsAdapter` stub for prod KMS swap |
| Private notes | AEAD on write; decrypt on read; legacy plaintext still readable |
| Rate limits | User-id keys for community; network keys = short-TTL salted HMAC of IP (day bucket); **E2E bypass forbidden in production** |
| Public IDs | Opaque `publicId` (`DET-XXXXXXXX`); `badgeNumber` internal only |
| Payments | **Visa** (`dev_visa` / `visa_gateway`) — Stripe not present |
| Headers | HSTS; CSP with script nonces + `strict-dynamic`; style residual `'unsafe-inline'`; XFO DENY; nosniff; COOP |
| Suspended | `suspendedAt` checked at login, JWT refresh, `requireActiveUser`, admin gates |

---

## 4. Approval record (2026-09-29)

| # | Conflict | Decision |
| --- | --- | --- |
| 1 | bcrypt → Argon2id (+ passkeys path) | **Approved** — Argon2id live; passkeys scaffold |
| 2 | Plaintext email → AEAD + blind index | **Approved** — implemented |
| 3 | Long JWT → shorter / server sessions | **Approved** — 8h JWT + sessionVersion rotation |
| 4 | IP-keyed rate limits → no raw IP retention | **Approved** — HMAC network keys |
| 5 | Sequential `badgeNumber` → opaque public id | **Approved** — `publicId` DET-* |
| 6 | KMS + field encryption | **Approved** — env/KMS interface + AEAD |
| 7 | Visa vs Stripe | **KEEP VISA** — do not add Stripe |
| 8 | CSP unsafe-inline/eval removal | **Approved** — script nonces; style residual documented |

---

## 5. Key location

| Secret | Location |
| --- | --- |
| `AUTH_SECRET` | Env / cloud secret manager |
| `ENCRYPTION_KEY` | Env today; **production: KMS-unwrapped DEK** (never in DB/git) |
| `EMAIL_BLIND_INDEX_KEY` | Env / secret manager (separate from field DEK) |
| `RATE_LIMIT_PEPPER` | Optional; derived from `AUTH_SECRET` in dev |
| DB / Visa / webhook | Secret manager; private network for Postgres |

**Production KMS:** Replace `envKmsAdapter` in `lib/crypto/secrets.ts` with AWS KMS / GCP Cloud KMS / Vault transit. App receives DEKs via secret manager injection or `decryptDataKey`. Keys must never be stored in Postgres or committed to git.

**Dev:** `ENCRYPTION_KEY` / `EMAIL_BLIND_INDEX_KEY` preferred; may derive from `AUTH_SECRET` when unset (non-production only).

---

## 6. CSP residual

- **script-src:** `'self' 'nonce-…' 'strict-dynamic'` (+ `'unsafe-eval'` **development only** for React/Next debug).
- **style-src:** `'self' 'unsafe-inline'` retained for Next/Tailwind runtime styles until a full style-nonce/hash pipeline lands.
- **img-src:** `'self' data: blob:` plus Carto dark basemap hosts (`a`–`d`.basemaps.cartocdn.com) for GLOBAL CASES Leaflet tiles.
- Middleware sets CSP on both request (for Next nonce injection) and response.

---

## 7. Retention (draft)

| Data | Retention |
| --- | --- |
| Password hashes | Until account delete + grace |
| Email ciphertext / blind index | Account lifetime; erase on account deletion |
| Reset/verify token hashes | Until used or expiry |
| Rate-limit buckets | TTL = window only (memory) |
| Checkout / webhook events | 30–90 days (policy TBD) |

---

## 8. Residual risks

1. JWT still bearer-cookie (not full server-side session store) — mitigated by 8h TTL + sessionVersion.
2. In-memory rate limiter is process-local (multi-instance needs Redis).
3. Passkeys not enrollment-ready.
4. Style CSP still allows `'unsafe-inline'`.
5. Legacy plaintext `email` / note rows may remain until backfilled/rewritten.
6. Admin capability matrix + audit log not yet implemented (S7).
7. Encrypted backups / private VPC are infra (ops).
8. Blind-index HMAC is deterministic — online enumeration of known emails still possible with DB access (expected tradeoff).

---

*Last updated: 2026-09-29 — security remediation turn (approved conflicts 1–6, 8; Visa kept).*
