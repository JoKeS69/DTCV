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
