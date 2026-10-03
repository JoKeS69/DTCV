"""Discovery search: short queries + Wikipedia seeds avoid pages=0."""

from __future__ import annotations

from research_worker.search import ResearchSearchClient, wikipedia_seed_hits


def test_build_queries_prefers_short_hariri_name():
    client = ResearchSearchClient.__new__(ResearchSearchClient)
    qs = client.build_queries(
        title="Assassination of Rafik Hariri",
        event_date_text="14 February 2005",
        location="Beirut",
    )
    assert qs[0] == "Assassination of Rafik Hariri"
    assert "Rafik Hariri" in qs
    # Must not ONLY use a long concatenated OpenSearch killer as first query
    assert not qs[0].endswith("Beirut 14 February 2005")


def test_wikipedia_seeds_include_rafic_variant():
    seeds = wikipedia_seed_hits("Assassination of Rafik Hariri")
    urls = {s.url for s in seeds}
    assert any("Rafic" in u or "Rafik" in u for u in urls)
    assert any("Assassination_of_Rafic_Hariri" in u or "Assassination_of_Rafik_Hariri" in u for u in urls)
    assert any(u.endswith("/Rafic_Hariri") or u.endswith("/Rafik_Hariri") for u in urls)


def test_search_case_hariri_returns_hits():
    """Live Wikipedia probe — one run must discover real pages (not pages=0)."""
    from research_worker.config import get_settings

    client = ResearchSearchClient(get_settings(require_keys=False))
    hits = client.search_case(
        title="Assassination of Rafik Hariri",
        event_date_text="14 February 2005",
        location="Beirut",
        limit=8,
    )
    assert len(hits) >= 1
    assert any("wikipedia.org" in h.url for h in hits)
