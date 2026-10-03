"""Tests for instruction-leak filter, people roles, and metadata normalization."""

from __future__ import annotations

from research_worker.quality import (
    filter_instruction_leaks,
    fix_spelling,
    is_instruction_leak,
    looks_like_title_as_location,
    normalize_metadata,
    normalize_people,
    normalize_role,
    presumption_note_for_person,
)


def test_instruction_leak_detects_disputed_section_prompt():
    text = (
        "Disputed claims must appear in a clearly labeled Disputed section "
        "so reviewers can separate contested material."
    )
    assert is_instruction_leak(text)


def test_filter_drops_instruction_claims():
    claims = [
        {
            "text": "Disputed claims must appear in a clearly labeled Disputed section.",
            "disputed": False,
            "sources": ["https://www.archives.gov/"],
        },
        {
            "text": "President Kennedy was shot in Dallas, Texas, on 22 November 1963.",
            "disputed": False,
            "sources": ["https://www.archives.gov/research/jfk"],
        },
    ]
    out = filter_instruction_leaks(claims)
    assert len(out) == 1
    assert "Dallas" in out[0]["text"]


def test_spelling_assassination():
    assert "assassination" in fix_spelling("The assasination occurred in 1963.").lower()


def test_jfk_is_victim_not_presumed_innocent():
    role = normalize_role("other", legal_status="deceased")
    assert role == "victim"
    note = presumption_note_for_person(role="victim", legal_status="deceased")
    assert "innocent" not in note.lower()
    assert "victim" in note.lower()


def test_subject_keeps_presumption():
    note = presumption_note_for_person(role="subject", legal_status="charged")
    assert "Presumed innocent" in note


def test_normalize_people_sets_victim_deceased():
    people = [
        {
            "name": "John F. Kennedy",
            "role": "other",
            "legalStatus": "deceased",
            "sources": ["https://www.archives.gov/research/jfk"],
        }
    ]
    out = normalize_people(people)
    assert out[0]["role"] == "victim"
    assert out[0]["legalStatus"] == "deceased"
    assert "innocent" not in out[0]["presumptionNote"].lower()


def test_metadata_rejects_title_as_location_and_bare_unsolved():
    meta = normalize_metadata(
        {
            "year": "1963",
            "eventDateText": "22 November 1963",
            "location": "Assassination of John F. Kennedy",
            "city": "Dallas",
            "region": "Texas",
            "country": "United States",
            "investigativeStatus": "unsolved",
            "statusEvidence": "",
        },
        title="Assassination of John F. Kennedy",
        existing_event_date=None,
        existing_location="NY",
    )
    assert meta["year"] == "1963"
    assert meta["location"] and "Dallas" in meta["location"]
    assert meta["investigativeStatus"] == "unknown"  # no evidence for unsolved
    assert looks_like_title_as_location(
        "Assassination of John F. Kennedy", "Assassination of John F. Kennedy"
    )


def test_official_finding_status_preserved_with_evidence():
    meta = normalize_metadata(
        {
            "year": "1963",
            "city": "Dallas",
            "region": "Texas",
            "country": "United States",
            "investigativeStatus": "official_finding",
            "statusEvidence": "Warren Commission issued official findings in 1964.",
        },
        title="Assassination of John F. Kennedy",
        existing_event_date="1963",
        existing_location=None,
    )
    assert meta["investigativeStatus"] == "official_finding"
    assert "Warren" in meta["legalStatusNote"]
