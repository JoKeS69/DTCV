"""Tests for claim/person upsert + pending supersede on assemble write."""

from __future__ import annotations

import sqlite3

from research_worker.db import (
    _upsert_claims,
    _upsert_people,
    supersede_pending_auto_rows,
)
from research_worker.dedupe import claim_similarity, normalize_person_name


def _mem() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(
        """
        CREATE TABLE claims (
          id TEXT PRIMARY KEY,
          caseId TEXT,
          text TEXT,
          disputed INTEGER,
          confidence REAL,
          sources TEXT,
          status TEXT,
          showOnPublish INTEGER,
          createdAt TEXT,
          updatedAt TEXT
        );
        CREATE TABLE people (
          id TEXT PRIMARY KEY,
          caseId TEXT,
          name TEXT,
          role TEXT,
          legalStatus TEXT,
          sources TEXT,
          status TEXT,
          presumptionNote TEXT,
          createdAt TEXT,
          updatedAt TEXT
        );
        """
    )
    return conn


def test_normalize_same_person_across_titles():
    assert normalize_person_name("Mr. Lee Harvey Oswald") == normalize_person_name(
        "Lee Harvey Oswald"
    )


def test_claim_similarity_minor_wording():
    a = "President Kennedy was assassinated in Dallas, Texas, on 22 November 1963."
    b = "President Kennedy was assassinated in Dallas Texas on November 22 1963."
    assert claim_similarity(a, b) >= 0.78


def test_upsert_people_does_not_multiply_same_name():
    conn = _mem()
    cur = conn.cursor()
    case_id = "case1"
    now = "2026-01-01T00:00:00+00:00"
    # Seed rejected + pending twins (pollution)
    cur.execute(
        """
        INSERT INTO people (id, caseId, name, role, legalStatus, sources, status,
          presumptionNote, createdAt, updatedAt)
        VALUES ('p1',?,?, 'victim','deceased','[]','rejected','',?,?),
               ('p2',?,?, 'other','deceased','[]','pending','',?,?)
        """,
        (case_id, "John F. Kennedy", now, now, case_id, "John F. Kennedy", now, now),
    )
    conn.commit()

    stats = _upsert_people(
        cur,
        case_id=case_id,
        people=[
            {
                "name": "John F. Kennedy",
                "role": "victim",
                "legalStatus": "deceased",
                "sources": ["https://www.archives.gov/research/jfk"],
                "presumptionNote": "Named as a victim/decedent of the event — not an accused person.",
            }
        ],
        now=now,
    )
    conn.commit()
    rows = list(cur.execute("SELECT id, status, role FROM people WHERE caseId=?", (case_id,)))
    assert len(rows) == 1
    assert rows[0]["status"] == "rejected"  # keep admin rejection
    assert rows[0]["role"] == "victim"
    assert stats["collapsed"] >= 1 or stats["updated"] >= 1


def test_upsert_claims_merges_near_duplicates_keep_approved():
    conn = _mem()
    cur = conn.cursor()
    case_id = "case1"
    now = "2026-01-01T00:00:00+00:00"
    cur.execute(
        """
        INSERT INTO claims (id, caseId, text, disputed, confidence, sources, status,
          showOnPublish, createdAt, updatedAt)
        VALUES
        ('c1',?, 'President Kennedy was assassinated in Dallas on 22 November 1963.',
         0, 0.5, '[]', 'approved', 1, ?, ?),
        ('c2',?, 'President Kennedy was assassinated in Dallas, Texas, on November 22, 1963.',
         0, 0.4, '[]', 'pending', 1, ?, ?)
        """,
        (case_id, now, now, case_id, now, now),
    )
    conn.commit()

    supersede_pending_auto_rows(conn, case_id)
    conn.commit()
    # pending twin removed
    assert cur.execute("SELECT count(*) FROM claims").fetchone()[0] == 1

    _upsert_claims(
        cur,
        case_id=case_id,
        claims=[
            {
                "text": "President Kennedy was assassinated in Dallas, Texas, on 22 November 1963.",
                "disputed": False,
                "sources": ["https://www.archives.gov/research/jfk"],
                "confidence": 0.8,
            }
        ],
        now=now,
    )
    conn.commit()
    rows = list(cur.execute("SELECT status, text FROM claims WHERE caseId=?", (case_id,)))
    assert len(rows) == 1
    assert rows[0]["status"] == "approved"


def test_upsert_people_merges_rafik_rafic():
    conn = _mem()
    cur = conn.cursor()
    case_id = "hariri"
    now = "2026-01-01T00:00:00+00:00"
    cur.execute(
        """
        INSERT INTO people (id, caseId, name, role, legalStatus, sources, status,
          presumptionNote, createdAt, updatedAt)
        VALUES ('p1',?,?, 'victim','deceased','[]','pending','',?,?)
        """,
        (case_id, "Rafik Hariri", now, now),
    )
    conn.commit()

    stats = _upsert_people(
        cur,
        case_id=case_id,
        people=[
            {
                "name": "Rafic Hariri",
                "role": "victim",
                "legalStatus": "deceased",
                "sources": ["https://en.wikipedia.org/wiki/Rafic_Hariri"],
            }
        ],
        now=now,
    )
    conn.commit()
    rows = list(cur.execute("SELECT name, status FROM people WHERE caseId=?", (case_id,)))
    assert len(rows) == 1
    assert stats["updated"] >= 1 or stats["collapsed"] >= 1


def test_upsert_claims_merges_hariri_car_bomb_twins():
    conn = _mem()
    cur = conn.cursor()
    case_id = "hariri"
    now = "2026-01-01T00:00:00+00:00"
    a = "Rafik Hariri was killed by a car bomb in Beirut on February 14, 2005"
    b = (
        "Rafik Hariri was killed in a car bomb explosion in Beirut "
        "on February 14, 2005"
    )
    cur.execute(
        """
        INSERT INTO claims (id, caseId, text, disputed, confidence, sources, status,
          showOnPublish, createdAt, updatedAt)
        VALUES ('c1',?,?,0,0.5,'[]','pending',1,?,?)
        """,
        (case_id, a, now, now),
    )
    conn.commit()
    stats = _upsert_claims(
        cur,
        case_id=case_id,
        claims=[{"text": b, "disputed": False, "sources": ["https://u"], "confidence": 0.9}],
        now=now,
    )
    conn.commit()
    rows = list(cur.execute("SELECT text FROM claims WHERE caseId=?", (case_id,)))
    assert len(rows) == 1
    assert stats["updated"] >= 1


def test_complete_run_overwrites_seed_title():
    from research_worker.db import complete_run_success

    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(
        """
        CREATE TABLE cases (
          id TEXT PRIMARY KEY, title TEXT, summary TEXT, status TEXT,
          draftContent TEXT, sources TEXT, eventDateText TEXT, location TEXT,
          legalStatusNote TEXT, labels TEXT, lastReviewedAt TEXT, updatedAt TEXT
        );
        CREATE TABLE claims (
          id TEXT PRIMARY KEY, caseId TEXT, text TEXT, disputed INTEGER,
          confidence REAL, sources TEXT, status TEXT, showOnPublish INTEGER,
          createdAt TEXT, updatedAt TEXT
        );
        CREATE TABLE people (
          id TEXT PRIMARY KEY, caseId TEXT, name TEXT, role TEXT,
          legalStatus TEXT, sources TEXT, status TEXT, presumptionNote TEXT,
          createdAt TEXT, updatedAt TEXT
        );
        CREATE TABLE case_revisions (
          id TEXT PRIMARY KEY, caseId TEXT, snapshot TEXT, note TEXT,
          createdBy TEXT, createdAt TEXT
        );
        CREATE TABLE research_runs (
          id TEXT PRIMARY KEY, caseId TEXT, status TEXT, finishedAt TEXT,
          stepsLog TEXT, pagesFetched INTEGER, stepsUsed INTEGER, costUnits REAL,
          promptTokens INTEGER, completionTokens INTEGER, totalTokens INTEGER,
          plan TEXT, updatedAt TEXT, errorMessage TEXT
        );
        CREATE TABLE audit_log (
          id TEXT PRIMARY KEY, actor TEXT, action TEXT, entityType TEXT,
          entityId TEXT, meta TEXT, createdAt TEXT
        );
        """
    )
    now = "2026-01-01T00:00:00+00:00"
    conn.execute(
        """
        INSERT INTO cases (id, title, summary, status, labels, updatedAt)
        VALUES ('c1', 'kennedy assasination', '', 'draft', '[]', ?)
        """,
        (now,),
    )
    conn.execute(
        """
        INSERT INTO research_runs (id, caseId, status, pagesFetched, stepsUsed,
          costUnits, promptTokens, completionTokens, totalTokens, updatedAt)
        VALUES ('r1', 'c1', 'running', 0, 0, 0, 0, 0, 0, ?)
        """,
        (now,),
    )
    conn.commit()
    complete_run_success(
        conn,
        run_id="r1",
        case_id="c1",
        actor="test",
        summary="Summary",
        draft_content={
            "metadata": {
                "investigativeStatus": "closed",
                "eventType": "assassination",
                "generatedTitle": "Assassination of John F. Kennedy",
            }
        },
        sources=[],
        claims=[],
        people=[],
        steps_log=[],
        pages_fetched=1,
        steps_used=3,
        cost_units=0.1,
        prompt_tokens=1,
        completion_tokens=1,
        total_tokens=2,
        plan={},
        generated_title="Assassination of John F. Kennedy",
    )
    row = conn.execute("SELECT title FROM cases WHERE id='c1'").fetchone()
    assert row["title"] == "Assassination of John F. Kennedy"


def test_complete_run_respects_title_locked():
    from research_worker.db import complete_run_success

    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(
        """
        CREATE TABLE cases (
          id TEXT PRIMARY KEY, title TEXT, summary TEXT, status TEXT,
          draftContent TEXT, sources TEXT, eventDateText TEXT, location TEXT,
          legalStatusNote TEXT, labels TEXT, lastReviewedAt TEXT, updatedAt TEXT
        );
        CREATE TABLE claims (
          id TEXT PRIMARY KEY, caseId TEXT, text TEXT, disputed INTEGER,
          confidence REAL, sources TEXT, status TEXT, showOnPublish INTEGER,
          createdAt TEXT, updatedAt TEXT
        );
        CREATE TABLE people (
          id TEXT PRIMARY KEY, caseId TEXT, name TEXT, role TEXT,
          legalStatus TEXT, sources TEXT, status TEXT, presumptionNote TEXT,
          createdAt TEXT, updatedAt TEXT
        );
        CREATE TABLE case_revisions (
          id TEXT PRIMARY KEY, caseId TEXT, snapshot TEXT, note TEXT,
          createdBy TEXT, createdAt TEXT
        );
        CREATE TABLE research_runs (
          id TEXT PRIMARY KEY, caseId TEXT, status TEXT, finishedAt TEXT,
          stepsLog TEXT, pagesFetched INTEGER, stepsUsed INTEGER, costUnits REAL,
          promptTokens INTEGER, completionTokens INTEGER, totalTokens INTEGER,
          plan TEXT, updatedAt TEXT, errorMessage TEXT
        );
        CREATE TABLE audit_log (
          id TEXT PRIMARY KEY, actor TEXT, action TEXT, entityType TEXT,
          entityId TEXT, meta TEXT, createdAt TEXT
        );
        """
    )
    now = "2026-01-01T00:00:00+00:00"
    conn.execute(
        """
        INSERT INTO cases (id, title, summary, status, labels, updatedAt)
        VALUES ('c1', 'Admin Locked Title', '', 'draft', ?, ?)
        """,
        ('["title_locked"]', now),
    )
    conn.execute(
        """
        INSERT INTO research_runs (id, caseId, status, pagesFetched, stepsUsed,
          costUnits, promptTokens, completionTokens, totalTokens, updatedAt)
        VALUES ('r1', 'c1', 'running', 0, 0, 0, 0, 0, 0, ?)
        """,
        (now,),
    )
    conn.commit()
    complete_run_success(
        conn,
        run_id="r1",
        case_id="c1",
        actor="test",
        summary="Summary",
        draft_content={
            "metadata": {
                "investigativeStatus": "closed",
                "eventType": "assassination",
                "generatedTitle": "Assassination of John F. Kennedy",
            }
        },
        sources=[],
        claims=[],
        people=[],
        steps_log=[],
        pages_fetched=1,
        steps_used=3,
        cost_units=0.1,
        prompt_tokens=1,
        completion_tokens=1,
        total_tokens=2,
        plan={},
        generated_title="Assassination of John F. Kennedy",
    )
    row = conn.execute("SELECT title FROM cases WHERE id='c1'").fetchone()
    assert row["title"] == "Admin Locked Title"
