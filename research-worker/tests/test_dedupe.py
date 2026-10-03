"""Unit tests for claim/person dedupe and off-topic source filtering."""

from __future__ import annotations

from research_worker.dedupe import (
    case_topic_tokens,
    claim_similarity,
    dedupe_claims,
    dedupe_people,
    source_relevant_to_case,
)


def test_claim_similarity_near_identical():
    a = "The attacks occurred on 11 September 2001 in the United States."
    b = "The attacks occurred on September 11, 2001 in the United States."
    assert claim_similarity(a, b) >= 0.82


def test_dedupe_claims_merges_sources_and_single_disputed_flag():
    claims = [
        {
            "text": "Four commercial airplanes were hijacked on 11 September 2001.",
            "disputed": False,
            "sources": ["https://en.wikipedia.org/wiki/September_11_attacks"],
            "confidence": 0.7,
        },
        {
            "text": "Four commercial aeroplanes were hijacked on September 11, 2001.",
            "disputed": True,
            "sources": ["https://www.fbi.gov/history/famous-cases/9-11-investigation"],
            "confidence": 0.8,
        },
        {
            "text": "Unrelated unique claim about al-Qaeda claiming responsibility.",
            "disputed": False,
            "sources": ["https://www.justice.gov/"],
            "confidence": 0.6,
        },
    ]
    out = dedupe_claims(claims)
    assert len(out) == 2
    primary = next(c for c in out if "hijacked" in c["text"].lower() or "hijack" in c["text"].lower() or "aeroplane" in c["text"].lower() or "airplane" in c["text"].lower())
    # Near-identical hijack claims should merge to one disputed=true with union sources
    hijack = [c for c in out if "hijack" in c["text"].lower() or "airplane" in c["text"].lower() or "aeroplane" in c["text"].lower()]
    assert len(hijack) == 1
    assert hijack[0]["disputed"] is True
    assert len(hijack[0]["sources"]) == 2


def test_dedupe_people_by_normalized_name():
    people = [
        {
            "name": "Osama bin Laden",
            "role": "leader",
            "legalStatus": "other",
            "sources": ["https://en.wikipedia.org/wiki/Osama_bin_Laden"],
        },
        {
            "name": "Mr. Osama Bin Laden",
            "role": "founder",
            "legalStatus": "deceased",
            "sources": ["https://www.fbi.gov/"],
        },
    ]
    out = dedupe_people(people)
    assert len(out) == 1
    assert out[0]["legalStatus"] == "deceased"
    assert "leader" in out[0]["role"].lower() or "founder" in out[0]["role"].lower()
    assert len(out[0]["sources"]) == 2


def test_reject_warren_commission_for_911_case():
    tokens = case_topic_tokens("September 11 attacks", "11 September 2001", None)
    assert "september" in tokens or "11" in tokens or "2001" in tokens
    assert not source_relevant_to_case(
        url="https://en.wikipedia.org/wiki/Warren_Commission",
        title="Warren Commission",
        snippet="Investigation of the assassination of John F. Kennedy",
        topic_tokens=tokens,
    )
    assert source_relevant_to_case(
        url="https://en.wikipedia.org/wiki/September_11_attacks",
        title="September 11 attacks",
        snippet="The September 11 attacks were four coordinated Islamist terrorist suicide attacks",
        topic_tokens=tokens,
    )


def test_hariri_claim_near_paraphrase_merges():
    a = "Rafik Hariri was killed by a car bomb in Beirut on February 14, 2005"
    b = (
        "Rafik Hariri was killed in a car bomb explosion in Beirut "
        "on February 14, 2005"
    )
    assert claim_similarity(a, b) >= 0.82
    out = dedupe_claims(
        [
            {"text": a, "disputed": False, "sources": ["https://u1"], "confidence": 0.7},
            {"text": b, "disputed": False, "sources": ["https://u2"], "confidence": 0.8},
        ]
    )
    assert len(out) == 1
    assert len(out[0]["sources"]) == 2


def test_rafik_rafic_people_merge():
    out = dedupe_people(
        [
            {
                "name": "Rafik Hariri",
                "role": "victim",
                "legalStatus": "deceased",
                "sources": ["https://en.wikipedia.org/wiki/Rafic_Hariri"],
            },
            {
                "name": "Rafic Hariri",
                "role": "victim",
                "legalStatus": "deceased",
                "sources": [
                    "https://en.wikipedia.org/wiki/Assassination_of_Rafic_Hariri"
                ],
            },
        ]
    )
    assert len(out) == 1
    assert len(out[0]["sources"]) == 2
