"""
Cases-DB access for the research worker (built-in SQLite file).

Uses Python stdlib `sqlite3` — no Postgres, no passwords, no DLL blockers.
Connects ONLY to the cases SQLite file (never the main auth/users DB).
No public HTTP — the worker polls `research_runs` where status = 'queued'.
"""

from __future__ import annotations

import json
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from research_worker.config import Settings, get_settings


def _cuid_like() -> str:
    return f"c{secrets.token_hex(12)}"


def _now() -> str:
    # Store ISO UTC strings (matches Prisma DateTime on SQLite)
    return datetime.now(timezone.utc).isoformat()


def _json(value: Any) -> str:
    return json.dumps(value, default=str)


def _loads_json(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, (bytes, bytearray)):
        value = value.decode("utf-8")
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def resolve_sqlite_path(settings: Settings | None = None) -> Path:
    """
    Resolve CASES_DATABASE_URL / CASES_SQLITE_PATH to an absolute file path.
    Relative paths are from the monorepo root (parent of research-worker/).
    """
    settings = settings or get_settings(require_keys=True)
    raw = (settings.cases_database_url or "").strip().strip("\"'")
    repo_root = Path(__file__).resolve().parents[2]

    if raw.startswith("file:"):
        raw = raw[5:]
    if not raw:
        raw = "data/detective_cases.db"

    p = Path(raw)
    if not p.is_absolute():
        p = (repo_root / p).resolve()
    return p


@contextmanager
def connect(settings: Settings | None = None) -> Iterator[sqlite3.Connection]:
    path = resolve_sqlite_path(settings)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 5000")
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def _transaction(conn: sqlite3.Connection) -> Iterator[None]:
    try:
        conn.execute("BEGIN IMMEDIATE")
        yield
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def _row_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {k: row[k] for k in row.keys()}


def claim_next_queued_run(conn: sqlite3.Connection) -> dict[str, Any] | None:
    """
    Atomically claim one queued research_runs row → running.
    SQLite: BEGIN IMMEDIATE + update-where-status=queued.
    """
    now = _now()
    with _transaction(conn):
        cur = conn.cursor()
        cur.execute(
            """
            SELECT r.id AS run_id,
                   r.caseId AS case_id,
                   r.plan AS run_plan,
                   c.title,
                   c.slug,
                   c.summary,
                   c.eventDateText AS event_date_text,
                   c.location
            FROM research_runs r
            JOIN cases c ON c.id = r.caseId
            WHERE r.status = 'queued'
            ORDER BY r.createdAt ASC
            LIMIT 1
            """
        )
        row = _row_dict(cur.fetchone())
        if not row:
            return None
        row["run_plan"] = _loads_json(row.get("run_plan"))
        cur.execute(
            """
            UPDATE research_runs
            SET status = 'running',
                startedAt = ?,
                updatedAt = ?
            WHERE id = ? AND status = 'queued'
            """,
            (now, now, row["run_id"]),
        )
        if cur.rowcount != 1:
            return None
        cur.execute(
            """
            UPDATE cases
            SET status = 'researching',
                updatedAt = ?
            WHERE id = ?
            """,
            (now, row["case_id"]),
        )
        return row


def update_run_progress(
    conn: sqlite3.Connection,
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
        SET stepsLog = ?,
            pagesFetched = ?,
            stepsUsed = ?,
            costUnits = ?,
            promptTokens = ?,
            completionTokens = ?,
            totalTokens = ?,
            updatedAt = ?
        WHERE id = ?
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
    conn: sqlite3.Connection,
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
        INSERT INTO audit_log (id, actor, action, entityType, entityId, meta, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
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
    conn: sqlite3.Connection,
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
    event_date_text: str | None = None,
    location: str | None = None,
    legal_status_note: str | None = None,
) -> None:
    """Assemble draft → pending_review. NEVER publishes."""
    now = _now()
    with _transaction(conn):
        cur = conn.cursor()
        # Only overwrite empty/weak case fields when metadata is present
        cur.execute(
            """
            SELECT eventDateText, location, legalStatusNote, title
            FROM cases WHERE id = ?
            """,
            (case_id,),
        )
        row = cur.fetchone()
        existing_date = row["eventDateText"] if row else None
        existing_loc = row["location"] if row else None
        existing_note = row["legalStatusNote"] if row else None
        title = row["title"] if row else ""

        new_date = event_date_text or existing_date
        new_loc = location or existing_loc
        # Avoid title-as-location pollution
        if new_loc and title and new_loc.strip().lower() == title.strip().lower():
            new_loc = existing_loc if existing_loc != new_loc else None
        new_note = legal_status_note or existing_note

        cur.execute(
            """
            UPDATE cases
            SET status = 'pending_review',
                summary = ?,
                draftContent = ?,
                sources = ?,
                eventDateText = ?,
                location = ?,
                legalStatusNote = ?,
                lastReviewedAt = NULL,
                updatedAt = ?
            WHERE id = ?
            """,
            (
                summary,
                _json(draft_content),
                _json(sources),
                new_date,
                new_loc,
                new_note,
                now,
                case_id,
            ),
        )
        for claim in claims:
            cur.execute(
                """
                INSERT INTO claims (
                  id, caseId, text, disputed, confidence, sources, status,
                  showOnPublish, createdAt, updatedAt
                ) VALUES (?,?,?,?,?,?,?,1,?,?)
                """,
                (
                    _cuid_like(),
                    case_id,
                    claim["text"],
                    1 if claim.get("disputed") else 0,
                    claim.get("confidence"),
                    _json(claim.get("sources") or []),
                    "disputed" if claim.get("disputed") else "pending",
                    now,
                    now,
                ),
            )
        for person in people:
            presumption = person.get("presumptionNote")
            if presumption is None:
                role = str(person.get("role") or "other").lower()
                legal = str(person.get("legalStatus") or "other").lower()
                if role == "victim" or (legal == "deceased" and role != "subject"):
                    presumption = (
                        "Named as a victim/decedent of the event — not an accused person."
                    )
                elif role in {"witness", "investigator", "official"}:
                    presumption = ""
                else:
                    presumption = (
                        "Presumed innocent unless proven guilty in a court of law."
                    )
            cur.execute(
                """
                INSERT INTO people (
                  id, caseId, name, role, legalStatus, sources, status,
                  presumptionNote, createdAt, updatedAt
                ) VALUES (?,?,?,?,?,?,'pending',?,?,?)
                """,
                (
                    _cuid_like(),
                    case_id,
                    person["name"],
                    person.get("role") or "other",
                    person.get("legalStatus") or "other",
                    _json(person.get("sources") or []),
                    presumption,
                    now,
                    now,
                ),
            )
        cur.execute(
            """
            INSERT INTO case_revisions (id, caseId, snapshot, note, createdBy, createdAt)
            VALUES (?,?,?,?,?,?)
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
                finishedAt = ?,
                stepsLog = ?,
                pagesFetched = ?,
                stepsUsed = ?,
                costUnits = ?,
                promptTokens = ?,
                completionTokens = ?,
                totalTokens = ?,
                plan = ?,
                updatedAt = ?
            WHERE id = ?
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
            INSERT INTO audit_log (id, actor, action, entityType, entityId, meta, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
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
    conn: sqlite3.Connection,
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
                finishedAt = ?,
                errorMessage = ?,
                stepsLog = ?,
                pagesFetched = ?,
                stepsUsed = ?,
                costUnits = ?,
                promptTokens = ?,
                completionTokens = ?,
                totalTokens = ?,
                updatedAt = ?
            WHERE id = ?
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
                updatedAt = ?
            WHERE id = ?
            """,
            (now, case_id),
        )
        cur.execute(
            """
            INSERT INTO audit_log (id, actor, action, entityType, entityId, meta, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
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


def candidate_exists(conn: sqlite3.Connection, title: str) -> bool:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT 1 FROM candidates
        WHERE title = ? AND status IN ('new', 'accepted')
        LIMIT 1
        """,
        (title,),
    )
    return cur.fetchone() is not None


def insert_candidate(
    conn: sqlite3.Connection,
    *,
    title: str,
    rationale: str,
    score: float,
    source_urls: list[str],
) -> None:
    now = _now()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO candidates (
          id, title, rationale, score, status, sourceUrls,
          discoveredAt, createdAt, updatedAt
        ) VALUES (?,?,?,?,'new',?,?,?,?)
        """,
        (
            _cuid_like(),
            title[:300],
            rationale[:500],
            score,
            _json(source_urls),
            now,
            now,
            now,
        ),
    )
    conn.commit()
