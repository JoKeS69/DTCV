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
    role = normalize_role(
        "other",
        legal_status="deceased",
        name="John F. Kennedy",
        case_title="Assassination of John F. Kennedy",
    )
    assert role == "victim"
    note = presumption_note_for_person(role="victim", legal_status="deceased")
    assert "innocent" not in note.lower()
    assert "victim" in note.lower()


def test_subject_keeps_presumption():
    note = presumption_note_for_person(role="subject", legal_status="charged")
    assert "Presumed innocent" in note


def test_attackers_are_subjects_not_victims():
    assert (
        normalize_role(
            "hijacker",
            legal_status="deceased",
            name="Mohammed Atta",
            case_title="September 11 attacks",
        )
        == "subject"
    )
    # Model wrongly labels victim — demote when name not in title on terror case
    assert (
        normalize_role(
            "victim",
            legal_status="deceased",
            name="Osama bin Laden",
            case_title="September 11 attacks",
        )
        == "subject"
    )
    note = presumption_note_for_person(
        role="subject", legal_status="deceased", name="Osama bin Laden"
    )
    assert "not a victim" in note.lower()
    assert "innocent" not in note.lower()


def test_normalize_people_sets_victim_deceased():
    people = [
        {
            "name": "John F. Kennedy",
            "role": "other",
            "legalStatus": "deceased",
            "sources": ["https://www.archives.gov/research/jfk"],
        },
        {
            "name": "Mohammed Atta",
            "role": "victim",
            "legalStatus": "deceased",
            "sources": ["https://www.fbi.gov/"],
        },
    ]
    out = normalize_people(people, case_title="September 11 attacks")
    # JFK not in 9/11 title → not auto-victim here; Atta demoted from victim→subject
    atta = next(p for p in out if "Atta" in p["name"])
    assert atta["role"] == "subject"

    out_jfk = normalize_people(
        [people[0]], case_title="Assassination of John F. Kennedy"
    )
    assert out_jfk[0]["role"] == "victim"
    assert "innocent" not in out_jfk[0]["presumptionNote"].lower()

def test_metadata_maps_vague_status_to_open_closed_dropped():
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
            "eventType": "other",
        },
        title="Assassination of John F. Kennedy",
        existing_event_date=None,
        existing_location="NY",
    )
    assert meta["year"] == "1963"
    assert meta["location"] and "Dallas" in meta["location"]
    # Assassination title without ongoing cue → closed (not unknown/unsolved)
    assert meta["investigativeStatus"] == "closed"
    assert meta["eventType"] == "assassination"
    assert looks_like_title_as_location(
        "Assassination of John F. Kennedy", "Assassination of John F. Kennedy"
    )


def test_official_finding_status_maps_to_closed():
    meta = normalize_metadata(
        {
            "year": "1963",
            "city": "Dallas",
            "region": "Texas",
            "country": "United States",
            "investigativeStatus": "official_finding",
            "statusEvidence": "Warren Commission issued official findings in 1964.",
            "eventType": "assassination",
        },
        title="Assassination of John F. Kennedy",
        existing_event_date="1963",
        existing_location=None,
    )
    assert meta["investigativeStatus"] == "closed"
    assert meta["eventType"] == "assassination"
    assert "Warren" in meta["legalStatusNote"]


def test_dropped_status_from_evidence():
    meta = normalize_metadata(
        {
            "year": "1995",
            "investigativeStatus": "open",
            "statusEvidence": "Prosecutors dropped the inquiry in 2001.",
            "eventType": "homicide",
        },
        title="Example homicide",
        existing_event_date=None,
        existing_location=None,
    )
    assert meta["investigativeStatus"] == "dropped"


def test_hariri_event_type_assassination():
    meta = normalize_metadata(
        {
            "year": "2005",
            "investigativeStatus": "unknown",
            "statusEvidence": "STL Special Tribunal issued judgments.",
            "eventType": "other",
        },
        title="Assassination of Rafik Hariri",
        existing_event_date="14 February 2005",
        existing_location="Beirut",
    )
    assert meta["eventType"] == "assassination"
    assert meta["investigativeStatus"] == "closed"
