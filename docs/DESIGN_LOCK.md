# Design lock — Phase 14

## Blocker

User-final mockups were **not present** in the cloud agent checkout:

- Expected: `desktop.jpeg`, `mobileversion.jpeg` (user paths under `C:\Users\abded\detectives\`)
- Searched: repo root, `public/`, `/cursor/stores/self/media/**`

## Interim lock (applied)

Hardened shell/home/auth/cases chrome toward existing design-refs with brand **DETECTIVE** (not CASE//NET):

- `design-refs/dashboard.jpg`
- `design-refs/login.jpg`
- `design-refs/mobile.jpg`

## To complete pixel-exact match

1. Add `desktop.jpeg` + `mobileversion.jpeg` to the repo root **or** agent store media.
2. Copy to `/cursor/stores/self/media/design-refs/desktop-final.jpeg` and `mobile-final.jpeg`.
3. Re-run a design pass against those images (homepage, shell, cases HUD, auth).
