"""
Cases-DB access for the research worker.

Uses **pg8000** (pure Python) so Windows works without libpq / psycopg binary DLLs
(Application Control often blocks those).

Connects ONLY to CASES_DATABASE_URL (restricted role). Never the main auth/users DB.
No public HTTP — the worker polls `research_runs` where status = 'queued'.
"""

from __future__ import annotations

import json
import secrets
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator
from urllib.parse import unquote, urlparse

import pg8000.dbapi

from research_worker.config import Settings, get_settings


def _cuid_like() -> str:
    return f"c{secrets.token_hex(12)}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _json(value: Any) -> str:
    return json.dumps(value, default=str)


def _parse_dsn(url: str) -> dict[str, Any]:
    u = urlparse(url)
    db = (u.path or "/").lstrip("/")
    if "?" in db:
        db = db.split("?", 1)[0]
    if not db:
        db = "postgres"
    return {
        "user": unquote(u.username or ""),
        "password": unquote(u.password or ""),
        "host": u.hostname or "localhost",
        "port": int(u.port or 5432),
        "database": db,
    }


def _connect_params(settings: Settings) -> dict[str, Any]:
    """
    Prefer discrete CASES_DB_* env vars (avoids URL quoting issues on Windows).
    Fall back to parsing CASES_DATABASE_URL.
    """
    import os

    user = (os.environ.get("CASES_DB_USER") or "").strip().strip("\"'")
    password = (os.environ.get("CASES_DB_PASSWORD") or "").strip().strip("\"'")
    host = (os.environ.get("CASES_DB_HOST") or "").strip().strip("\"'")
    port_raw = (os.environ.get("CASES_DB_PORT") or "").strip().strip("\"'")
    database = (os.environ.get("CASES_DB_NAME") or "").strip().strip("\"'")

    if user and password and host and database:
        return {
            "user": user,
            "password": password,
            "host": host,
            "port": int(port_raw or "5432"),
            "database": database,
        }
    return _parse_dsn(settings.cases_database_url)


def _row_dict(cur: Any, row: tuple[Any, ...] | None) -> dict[str, Any] | None:
    if row is None:
        return None
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, row, strict=False))


@contextmanager
def connect(settings: Settings | None = None) -> Iterator[Any]:
    settings = settings or get_settings(require_keys=True)
    params = _connect_params(settings)
    if not params.get("user") or not params.get("database"):
        raise RuntimeError(
            "Set CASES_DB_USER/CASES_DB_PASSWORD/CASES_DB_HOST/CASES_DB_NAME "
            "or CASES_DATABASE_URL (cases DB only)"
        )
    conn = pg8000.dbapi.connect(**params)
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def _transaction(conn: Any) -> Iterator[None]:
    try:
        yield
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def claim_next_queued_run(conn: Any) -> dict[str, Any] | None:
    """
    Atomically claim one queued research_runs row → running.
    Uses FOR UPDATE SKIP LOCKED so multiple workers do not double-claim.
    """
    now = _now()
    with _transaction(conn):
        cur = conn.cursor()
        cur.execute(
            """
            SELECT r.id AS run_id,
                   r."caseId" AS case_id,
                   r.plan AS run_plan,
                   c.title,
                   c.slug,
                   c.summary,
                   c."eventDateText" AS event_date_text,
                   c.location
            FROM research_runs r
            JOIN cases c ON c.id = r."caseId"
            WHERE r.status = 'queued'
            ORDER BY r."createdAt" ASC
            FOR UPDATE OF r SKIP LOCKED
            LIMIT 1
            """
        )
        row = _row_dict(cur, cur.fetchone())
        if not row:
            return None
        # plan may already be dict/list from pg8000 json decode
        cur.execute(
            """
            UPDATE research_runs
            SET status = 'running',
                "startedAt" = %s,
                "updatedAt" = %s
            WHERE id = %s
            """,
            (now, now, row["run_id"]),
        )
        cur.execute(
            """
            UPDATE cases
            SET status = 'researching',
                "updatedAt" = %s
            WHERE id = %s
            """,
            (now, row["case_id"]),
        )
        return row


def update_run_progress(
    conn: Any,
    run_id: str,
    *,
    steps_log: list[dict[str, Any]],
    pages_fetched: int,
    steps_used: int,
    cost_units: float,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    total_tokens: int = 0,
) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE research_runs
        SET "stepsLog" = %s::jsonb,
            "pagesFetched" = %s,
            "stepsUsed" = %s,
            "costUnits" = %s,
            "promptTokens" = %s,
            "completionTokens" = %s,
            "totalTokens" = %s,
            "updatedAt" = %s
        WHERE id = %s
        """,
        (
            _json(steps_log),
            pages_fetched,
            steps_used,
            cost_units,
            prompt_tokens,
            completion_tokens,
            total_tokens,
            _now(),
            run_id,
        ),
    )
    conn.commit()


def write_audit(
    conn: Any,
    *,
    actor: str,
    action: str,
    entity_type: str,
    entity_id: str | None,
    meta: dict[str, Any] | None = None,
) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO audit_log (id, actor, action, "entityType", "entityId", meta, "createdAt")
        VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
        """,
        (
            _cuid_like(),
            actor,
            action,
            entity_type,
            entity_id,
            _json(meta) if meta is not None else None,
            _now(),
        ),
    )


def complete_run_success(
    conn: Any,
    *,
    run_id: str,
    case_id: str,
    actor: str,
    summary: str,
    draft_content: dict[str, Any],
    sources: list[dict[str, Any]],
    claims: list[dict[str, Any]],
    people: list[dict[str, Any]],
    steps_log: list[dict[str, Any]],
    pages_fetched: int,
    steps_used: int,
    cost_units: float,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    plan: dict[str, Any],
) -> None:
    """Assemble draft → pending_review. NEVER publishes."""
    now = _now()
    with _transaction(conn):
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE cases
            SET status = 'pending_review',
                summary = %s,
                "draftContent" = %s::jsonb,
                sources = %s::jsonb,
                "lastReviewedAt" = NULL,
                "updatedAt" = %s
            WHERE id = %s
            """,
            (
                summary,
                _json(draft_content),
                _json(sources),
                now,
                case_id,
            ),
        )
        for claim in claims:
            cur.execute(
                """
                INSERT INTO claims (
                  id, "caseId", text, disputed, confidence, sources, status,
                  "showOnPublish", "createdAt", "updatedAt"
                ) VALUES (%s,%s,%s,%s,%s,%s::jsonb,%s::"ClaimReviewStatus",true,%s,%s)
                """,
                (
                    _cuid_like(),
                    case_id,
                    claim["text"],
                    bool(claim.get("disputed")),
                    claim.get("confidence"),
                    _json(claim.get("sources") or []),
                    "disputed" if claim.get("disputed") else "pending",
                    now,
                    now,
                ),
            )
        for person in people:
            cur.execute(
                """
                INSERT INTO people (
                  id, "caseId", name, role, "legalStatus", sources, status,
                  "presumptionNote", "createdAt", "updatedAt"
                ) VALUES (
                  %s,%s,%s,%s,%s::"LegalPersonStatus",%s::jsonb,'pending'::"PersonReviewStatus",
                  'Presumed innocent unless proven guilty in a court of law.',
                  %s,%s
                )
                """,
                (
                    _cuid_like(),
                    case_id,
                    person["name"],
                    person.get("role") or "other",
                    person.get("legalStatus") or "other",
                    _json(person.get("sources") or []),
                    now,
                    now,
                ),
            )
        cur.execute(
            """
            INSERT INTO case_revisions (id, "caseId", snapshot, note, "createdBy", "createdAt")
            VALUES (%s,%s,%s::jsonb,%s,%s,%s)
            """,
            (
                _cuid_like(),
                case_id,
                _json(
                    {
                        "draftContent": draft_content,
                        "claims": claims,
                        "people": people,
                        "sources": sources,
                    }
                ),
                "research_agent_draft",
                actor,
                now,
            ),
        )
        cur.execute(
            """
            UPDATE research_runs
            SET status = 'completed',
                "finishedAt" = %s,
                "stepsLog" = %s::jsonb,
                "pagesFetched" = %s,
                "stepsUsed" = %s,
                "costUnits" = %s,
                "promptTokens" = %s,
                "completionTokens" = %s,
                "totalTokens" = %s,
                plan = %s::jsonb,
                "updatedAt" = %s
            WHERE id = %s
            """,
            (
                now,
                _json(steps_log),
                pages_fetched,
                steps_used,
                cost_units,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                _json(plan),
                now,
                run_id,
            ),
        )
        cur.execute(
            """
            INSERT INTO audit_log (id, actor, action, "entityType", "entityId", meta, "createdAt")
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
            """,
            (
                _cuid_like(),
                actor,
                "research.completed",
                "case",
                case_id,
                _json(
                    {
                        "runId": run_id,
                        "pagesFetched": pages_fetched,
                        "stepsUsed": steps_used,
                        "costUnits": cost_units,
                        "totalTokens": total_tokens,
                        "worker": "python-research-worker",
                    }
                ),
                now,
            ),
        )


def complete_run_failure(
    conn: Any,
    *,
    run_id: str,
    case_id: str,
    actor: str,
    error_message: str,
    steps_log: list[dict[str, Any]],
    pages_fetched: int,
    steps_used: int,
    cost_units: float,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
) -> None:
    now = _now()
    with _transaction(conn):
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE research_runs
            SET status = 'failed',
                "finishedAt" = %s,
                "errorMessage" = %s,
                "stepsLog" = %s::jsonb,
                "pagesFetched" = %s,
                "stepsUsed" = %s,
                "costUnits" = %s,
                "promptTokens" = %s,
                "completionTokens" = %s,
                "totalTokens" = %s,
                "updatedAt" = %s
            WHERE id = %s
            """,
            (
                now,
                error_message[:500],
                _json(steps_log),
                pages_fetched,
                steps_used,
                cost_units,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                now,
                run_id,
            ),
        )
        cur.execute(
            """
            UPDATE cases
            SET status = 'pending_review',
                "updatedAt" = %s
            WHERE id = %s
            """,
            (now, case_id),
        )
        cur.execute(
            """
            INSERT INTO audit_log (id, actor, action, "entityType", "entityId", meta, "createdAt")
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
            """,
            (
                _cuid_like(),
                actor,
                "research.failed",
                "case",
                case_id,
                _json(
                    {
                        "runId": run_id,
                        "error": error_message[:500],
                        "worker": "python-research-worker",
                    }
                ),
                now,
            ),
        )


def candidate_exists(conn: Any, title: str) -> bool:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT 1 FROM candidates
        WHERE title = %s AND status IN ('new', 'accepted')
        LIMIT 1
        """,
        (title,),
    )
    return cur.fetchone() is not None


def insert_candidate(
    conn: Any,
    *,
    title: str,
    rationale: str,
    score: float,
    source_urls: list[str],
) -> None:
    now = _now()
    cur = conn.cursor()
    # text[] — pass as PostgreSQL array literal via pg8000 list support
    cur.execute(
        """
        INSERT INTO candidates (
          id, title, rationale, score, status, "sourceUrls",
          "discoveredAt", "createdAt", "updatedAt"
        ) VALUES (%s,%s,%s,%s,'new'::"CandidateStatus",%s,%s,%s,%s)
        """,
        (
            _cuid_like(),
            title[:300],
            rationale[:500],
            score,
            source_urls,
            now,
            now,
            now,
        ),
    )
    conn.commit()
