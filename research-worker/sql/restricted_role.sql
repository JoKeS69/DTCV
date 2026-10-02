-- Restricted Postgres role for the external research worker.
-- Run as a superuser / migrate admin against the CASES database only.
-- The worker must NEVER connect to the main site (users/auth) database.

-- 1) Create role (adjust password via secrets manager; do not commit real passwords)
-- CREATE ROLE research_worker LOGIN PASSWORD 'replace-me';

-- 2) Connect privilege on the cases DB only
-- GRANT CONNECT ON DATABASE detective_cases TO research_worker;
-- \c detective_cases

GRANT USAGE ON SCHEMA public TO research_worker;

-- Tables the worker needs (read/write). No DDL.
GRANT SELECT, INSERT, UPDATE ON
  cases,
  claims,
  people,
  research_runs,
  case_revisions,
  candidates,
  audit_log
TO research_worker;

-- Optional: takedown_requests is admin/UI — omit unless worker needs it.
-- GRANT SELECT ON takedown_requests TO research_worker;

-- Explicit denials (document intent; Postgres has no DENY — just omit grants).
-- Do NOT grant: any table in the main site DB, CREATE, ALTER, DROP, TRUNCATE,
-- SEQUENCE ownership beyond usage if sequences are used for ids (cuid ids → none).

-- Connection string shape for worker env:
-- CASES_DATABASE_URL=postgresql://research_worker:...@HOST:5432/detective_cases

-- Migration DDL uses a DIFFERENT role (CASES_DATABASE_URL_MIGRATE), never this one.
