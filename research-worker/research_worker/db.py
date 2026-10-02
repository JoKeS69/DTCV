"""
Cases-DB access for the research worker.

Connects ONLY to CASES_DATABASE_URL (restricted role). Never the main auth/users DB.
No public HTTP — the worker polls `research_runs` where status = 'queued'.
"""

from __future__ import annotations

import secrets
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from research_worker.config import Settings, get_settings


def _cuid_like() -> str:
    """Unique id compatible with Prisma TEXT @id defaults."""
    return f"c{secrets.token_hex(12)}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


@contextmanager
def connect(settings: Settings | None = None) -> Iterator[psycopg.Connection]:
    settings = settings or get_settings(require_keys=True)
    if not settings.cases_database_url:
        raise RuntimeError("CASES_DATABASE_URL required (cases DB only)")
    with psycopg.connect(settings.cases_database_url, row_factory=dict_row) as conn:
        yield conn


def claim_next_queued_run(conn: psycopg.Connection) -> dict[str, Any] | None:
    """
    Atomically claim one queued research_runs row → running.
    Uses FOR UPDATE SKIP LOCKED so multiple workers do not double-claim.
    """
    now = _now()
    with conn.transaction():
        with conn.cursor() as cur:
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
            row = cur.fetchone()
            if not row:
                return None
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
            return dict(row)


def update_run_progress(
    conn: psycopg.Connection,
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
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE research_runs
            SET "stepsLog" = %s,
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
                Jsonb(steps_log),
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
    conn: psycopg.Connection,
    *,
    actor: str,
    action: str,
    entity_type: str,
    entity_id: str | None,
    meta: dict[str, Any] | None = None,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO audit_log (id, actor, action, "entityType", "entityId", meta, "createdAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                _cuid_like(),
                actor,
                action,
                entity_type,
                entity_id,
                Jsonb(meta) if meta is not None else None,
                _now(),
            ),
        )


def complete_run_success(
    conn: psycopg.Connection,
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
    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE cases
                SET status = 'pending_review',
                    summary = %s,
                    "draftContent" = %s,
                    sources = %s,
                    "lastReviewedAt" = NULL,
                    "updatedAt" = %s
                WHERE id = %s
                """,
                (
                    summary,
                    Jsonb(draft_content),
                    Jsonb(sources),
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
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s::"ClaimReviewStatus",true,%s,%s)
                    """,
                    (
                        _cuid_like(),
                        case_id,
                        claim["text"],
                        bool(claim.get("disputed")),
                        claim.get("confidence"),
                        Jsonb(claim.get("sources") or []),
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
                      %s,%s,%s,%s,%s::"LegalPersonStatus",%s,'pending'::"PersonReviewStatus",
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
                        Jsonb(person.get("sources") or []),
                        now,
                        now,
                    ),
                )
            cur.execute(
                """
                INSERT INTO case_revisions (id, "caseId", snapshot, note, "createdBy", "createdAt")
                VALUES (%s,%s,%s,%s,%s,%s)
                """,
                (
                    _cuid_like(),
                    case_id,
                    Jsonb(
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
                    "stepsLog" = %s,
                    "pagesFetched" = %s,
                    "stepsUsed" = %s,
                    "costUnits" = %s,
                    "promptTokens" = %s,
                    "completionTokens" = %s,
                    "totalTokens" = %s,
                    plan = %s,
                    "updatedAt" = %s
                WHERE id = %s
                """,
                (
                    now,
                    Jsonb(steps_log),
                    pages_fetched,
                    steps_used,
                    cost_units,
                    prompt_tokens,
                    completion_tokens,
                    total_tokens,
                    Jsonb(plan),
                    now,
                    run_id,
                ),
            )
            cur.execute(
                """
                INSERT INTO audit_log (id, actor, action, "entityType", "entityId", meta, "createdAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    _cuid_like(),
                    actor,
                    "research.completed",
                    "case",
                    case_id,
                    Jsonb(
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
    conn: psycopg.Connection,
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
    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE research_runs
                SET status = 'failed',
                    "finishedAt" = %s,
                    "errorMessage" = %s,
                    "stepsLog" = %s,
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
                    Jsonb(steps_log),
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
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    _cuid_like(),
                    actor,
                    "research.failed",
                    "case",
                    case_id,
                    Jsonb(
                        {
                            "runId": run_id,
                            "error": error_message[:500],
                            "worker": "python-research-worker",
                        }
                    ),
                    now,
                ),
            )


def candidate_exists(conn: psycopg.Connection, title: str) -> bool:
    with conn.cursor() as cur:
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
    conn: psycopg.Connection,
    *,
    title: str,
    rationale: str,
    score: float,
    source_urls: list[str],
) -> None:
    now = _now()
    with conn.cursor() as cur:
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
