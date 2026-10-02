"""Optional Brave Search — not required. Prefer research_worker.search."""

from __future__ import annotations

from research_worker.search import ResearchSearchClient, SearchHit

__all__ = ["BraveSearchClient", "SearchHit"]


class BraveSearchClient(ResearchSearchClient):
    """Deprecated alias — use ResearchSearchClient (keyless by default)."""
