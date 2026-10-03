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
from research_worker.dedupe import (
    claim_similarity,
    normalize_person_name,
    _merge_url_lists,
    _prefer_legal,
    _merge_roles,
)


_CLAIM_STATUS_RANK = {
    "approved": 40,
    "disputed": 30,
    "rejected": 25,
    "pending": 10,
}

_PERSON_STATUS_RANK = {
    "approved": 40,
    "rejected": 25,
    "pending": 10,
}


def _parse_sources_field(raw: Any) -> list[Any]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []
    return []


def supersede_pending_auto_rows(conn: sqlite3.Connection, case_id: str) -> dict[str, int]:
    """
    Before writing a new research draft: delete *pending* claims/people from older runs.
    Keeps admin-reviewed rows (approved / rejected / disputed).
    """
    cur = conn.cursor()
    cur.execute(
        """
        DELETE FROM claims
        WHERE caseId = ? AND status = 'pending'
        """,
        (case_id,),
    )
    claims_deleted = cur.rowcount
    cur.execute(
        """
        DELETE FROM people
        WHERE caseId = ? AND status = 'pending'
        """,
        (case_id,),
    )
    people_deleted = cur.rowcount
    return {"claimsDeleted": claims_deleted, "peopleDeleted": people_deleted}


def _upsert_claims(
    cur: sqlite3.Cursor,
    *,
    case_id: str,
    claims: list[dict[str, Any]],
    now: str,
) -> dict[str, int]:
    cur.execute(
        """
        SELECT id, text, disputed, confidence, sources, status, showOnPublish
        FROM claims WHERE caseId = ?
        """,
        (case_id,),
    )
    existing = [dict(r) for r in cur.fetchall()]
    inserted = updated = skipped = 0

    for claim in claims:
        text = str(claim.get("text") or "").strip()
        if not text:
            continue
        match = None
        best = 0.0
        for row in existing:
            sim = claim_similarity(text, str(row.get("text") or ""))
            if sim >= 0.78 and sim > best:
                best = sim
                match = row
        sources = _merge_url_lists(
            _parse_sources_field(claim.get("sources")),
            _parse_sources_field(match.get("sources") if match else None),
        )
        disputed = bool(claim.get("disputed"))
        if match and (match.get("disputed") or match.get("status") == "disputed"):
            disputed = True
        confidence = claim.get("confidence")
        if confidence is None and match is not None:
            confidence = match.get("confidence")

        if match is None:
            new_id = _cuid_like()
            status = "disputed" if disputed else "pending"
            cur.execute(
                """
                INSERT INTO claims (
                  id, caseId, text, disputed, confidence, sources, status,
                  showOnPublish, createdAt, updatedAt
                ) VALUES (?,?,?,?,?,?,?,1,?,?)
                """,
                (
                    new_id,
                    case_id,
                    text,
                    1 if disputed else 0,
                    confidence,
                    _json(sources),
                    status,
                    now,
                    now,
                ),
            )
            existing.append(
                {
                    "id": new_id,
                    "text": text,
                    "disputed": disputed,
                    "confidence": confidence,
                    "sources": sources,
                    "status": status,
                }
            )
            inserted += 1
            continue

        # Review status: never reset approved/rejected/disputed back to pending
        old_status = str(match.get("status") or "pending")
        if old_status in {"approved", "rejected", "disputed"}:
            new_status = old_status
            if disputed and old_status == "approved":
                # keep approved text update but don't force disputed status
                new_status = "approved"
            elif disputed and old_status == "rejected":
                new_status = "rejected"
            elif disputed:
                new_status = "disputed"
        else:
            new_status = "disputed" if disputed else "pending"

        cur.execute(
            """
            UPDATE claims
            SET text = ?,
                disputed = ?,
                confidence = ?,
                sources = ?,
                status = ?,
                updatedAt = ?
            WHERE id = ?
            """,
            (
                text if len(text) >= len(str(match.get("text") or "")) else match["text"],
                1 if disputed or new_status == "disputed" else 0,
                confidence,
                _json(sources),
                new_status,
                now,
                match["id"],
            ),
        )
        match["text"] = text
        match["sources"] = sources
        match["status"] = new_status
        match["disputed"] = disputed
        updated += 1

    # Collapse any remaining near-duplicate rows (e.g. rejected + approved twins)
    cur.execute(
        """
        SELECT id, text, disputed, confidence, sources, status
        FROM claims WHERE caseId = ?
        ORDER BY createdAt ASC
        """,
        (case_id,),
    )
    rows = [dict(r) for r in cur.fetchall()]
    keep: list[dict[str, Any]] = []
    for row in rows:
        twin = None
        for k in keep:
            if claim_similarity(str(row["text"] or ""), str(k["text"] or "")) >= 0.78:
                twin = k
                break
        if twin is None:
            keep.append(row)
            continue
        # Prefer higher review status
        if _CLAIM_STATUS_RANK.get(str(row["status"]), 0) > _CLAIM_STATUS_RANK.get(
            str(twin["status"]), 0
        ):
            survivor, loser = row, twin
            keep[keep.index(twin)] = row
        else:
            survivor, loser = twin, row
        merged_sources = _merge_url_lists(
            _parse_sources_field(survivor.get("sources")),
            _parse_sources_field(loser.get("sources")),
        )
        cur.execute(
            """
            UPDATE claims SET sources = ?, updatedAt = ? WHERE id = ?
            """,
            (_json(merged_sources), now, survivor["id"]),
        )
        cur.execute("DELETE FROM claims WHERE id = ?", (loser["id"],))
        skipped += 1

    return {"inserted": inserted, "updated": updated, "collapsed": skipped}


def _upsert_people(
    cur: sqlite3.Cursor,
    *,
    case_id: str,
    people: list[dict[str, Any]],
    now: str,
) -> dict[str, int]:
    cur.execute(
        """
        SELECT id, name, role, legalStatus, sources, status, presumptionNote
        FROM people WHERE caseId = ?
        """,
        (case_id,),
    )
    existing = [dict(r) for r in cur.fetchall()]
    by_key: dict[str, dict[str, Any]] = {}
    for row in existing:
        key = normalize_person_name(str(row.get("name") or ""))
        if not key:
            continue
        # If multiple already exist, keep highest status for matching
        prev = by_key.get(key)
        if prev is None or _PERSON_STATUS_RANK.get(
            str(row.get("status")), 0
        ) > _PERSON_STATUS_RANK.get(str(prev.get("status")), 0):
            by_key[key] = row

    inserted = updated = collapsed = 0

    for person in people:
        name = str(person.get("name") or "").strip()
        if not name:
            continue
        key = normalize_person_name(name)
        if not key:
            continue
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

        match = by_key.get(key)
        sources = _merge_url_lists(
            _parse_sources_field(person.get("sources")),
            _parse_sources_field(match.get("sources") if match else None),
        )
        role = str(person.get("role") or "other")
        legal = str(person.get("legalStatus") or "other")
        if match:
            role = _merge_roles(str(match.get("role") or ""), role)
            # Prefer subject over mistaken victim for the same person
            role_l = role.lower()
            if any(
                k in role_l
                for k in (
                    "subject",
                    "hijacker",
                    "terrorist",
                    "perpetrator",
                    "attacker",
                    "organizer",
                )
            ):
                role = "subject"
            elif "victim" in role_l:
                role = "victim"
            legal = _prefer_legal(str(match.get("legalStatus") or "other"), legal)

        if match is None:
            new_id = _cuid_like()
            cur.execute(
                """
                INSERT INTO people (
                  id, caseId, name, role, legalStatus, sources, status,
                  presumptionNote, createdAt, updatedAt
                ) VALUES (?,?,?,?,?,?,'pending',?,?,?)
                """,
                (
                    new_id,
                    case_id,
                    name,
                    role,
                    legal,
                    _json(sources),
                    presumption,
                    now,
                    now,
                ),
            )
            by_key[key] = {
                "id": new_id,
                "name": name,
                "role": role,
                "legalStatus": legal,
                "sources": sources,
                "status": "pending",
                "presumptionNote": presumption,
            }
            inserted += 1
            continue

        old_status = str(match.get("status") or "pending")
        # Never flip approved/rejected back to pending
        new_status = old_status if old_status in {"approved", "rejected"} else "pending"

        prefer_name = (
            match["name"]
            if len(str(match.get("name") or "")) >= len(name)
            else name
        )
        cur.execute(
            """
            UPDATE people
            SET name = ?,
                role = ?,
                legalStatus = ?,
                sources = ?,
                status = ?,
                presumptionNote = ?,
                updatedAt = ?
            WHERE id = ?
            """,
            (
                prefer_name,
                role,
                legal,
                _json(sources),
                new_status,
                presumption if presumption is not None else match.get("presumptionNote"),
                now,
                match["id"],
            ),
        )
        match.update(
            {
                "name": prefer_name,
                "role": role,
                "legalStatus": legal,
                "sources": sources,
                "status": new_status,
            }
        )
        updated += 1

    # Collapse leftover same-name rows (rejected + pending twins etc.)
    cur.execute(
        "SELECT id, name, role, legalStatus, sources, status FROM people WHERE caseId = ?",
        (case_id,),
    )
    rows = [dict(r) for r in cur.fetchall()]
    survivors: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = normalize_person_name(str(row.get("name") or ""))
        if not key:
            continue
        if key not in survivors:
            survivors[key] = row
            continue
        twin = survivors[key]
        if _PERSON_STATUS_RANK.get(str(row["status"]), 0) > _PERSON_STATUS_RANK.get(
            str(twin["status"]), 0
        ):
            survivor, loser = row, twin
            survivors[key] = row
        else:
            survivor, loser = twin, row
        merged_sources = _merge_url_lists(
            _parse_sources_field(survivor.get("sources")),
            _parse_sources_field(loser.get("sources")),
        )
        merged_role = _merge_roles(
            str(survivor.get("role") or ""), str(loser.get("role") or "")
        )
        role_l = merged_role.lower()
        if any(
            k in role_l
            for k in (
                "subject",
                "hijacker",
                "terrorist",
                "perpetrator",
                "attacker",
                "organizer",
            )
        ):
            merged_role = "subject"
        elif "victim" in role_l:
            merged_role = "victim"
        merged_legal = _prefer_legal(
            str(survivor.get("legalStatus") or "other"),
            str(loser.get("legalStatus") or "other"),
        )
        cur.execute(
            """
            UPDATE people
            SET sources = ?, role = ?, legalStatus = ?, updatedAt = ?
            WHERE id = ?
            """,
            (_json(merged_sources), merged_role, merged_legal, now, survivor["id"]),
        )
        cur.execute("DELETE FROM people WHERE id = ?", (loser["id"],))
        collapsed += 1

    return {"inserted": inserted, "updated": updated, "collapsed": collapsed}

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

        # New draft: drop prior *pending* auto rows, keep admin-reviewed.
        superseded = supersede_pending_auto_rows(conn, case_id)
        claim_stats = _upsert_claims(cur, case_id=case_id, claims=claims, now=now)
        people_stats = _upsert_people(cur, case_id=case_id, people=people, now=now)

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
                        "upsert": {
                            "superseded": superseded,
                            "claims": claim_stats,
                            "people": people_stats,
                        },
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
