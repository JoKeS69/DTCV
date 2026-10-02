#!/usr/bin/env bash
# Deploy cases-research DB migrations (CASES_DATABASE_URL).
#
# Rules:
# - Run AFTER main-site migrate, BEFORE the new app version starts serving traffic.
# - Require an explicit backup acknowledgement (or CI BACKUP_OK=1 after a real backup).
# - Use a migration-only DB credential (not the research-agent restricted role).
# - Deploy-mode only (`prisma migrate deploy`) — never migrate on app boot.
# - Fail the deploy on any error.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${CASES_DATABASE_URL:-}" && -z "${CASES_DATABASE_URL_MIGRATE:-}" ]]; then
  echo "error: set CASES_DATABASE_URL_MIGRATE (preferred) or CASES_DATABASE_URL" >&2
  exit 1
fi

# Prefer migration-only credential when provided.
if [[ -n "${CASES_DATABASE_URL_MIGRATE:-}" ]]; then
  export CASES_DATABASE_URL="${CASES_DATABASE_URL_MIGRATE}"
fi

if [[ "${BACKUP_OK:-}" != "1" ]]; then
  echo "error: refuse to migrate without backup acknowledgement." >&2
  echo "  Take a Postgres backup / PITR snapshot of the cases DB, then re-run with BACKUP_OK=1." >&2
  exit 1
fi

echo "==> prisma migrate deploy (cases DB)"
npx prisma migrate deploy --config prisma-cases.config.ts

echo "==> cases DB migrations applied successfully"
