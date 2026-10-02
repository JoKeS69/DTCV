"""Brave Search API adapter (worker-only key)."""

from __future__ import annotations

from dataclasses import dataclass

import httpx

from research_worker.backoff import RetryableProviderError, with_backoff
from research_worker.config import Settings, get_settings


@dataclass
class SearchHit:
    title: str
    url: str
    snippet: str | None = None


class BraveSearchClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings(require_keys=True)
        if not self.settings.brave_api_key:
            raise RuntimeError("BRAVE_API_KEY required on research worker only")

    def search(self, query: str, limit: int = 5) -> list[SearchHit]:
        settings = self.settings
        timeout_s = max(1.0, settings.limits.timeout_ms / 1000.0)

        def _call() -> list[SearchHit]:
            try:
                with httpx.Client(timeout=timeout_s) as client:
                    res = client.get(
                        settings.brave_search_base_url,
                        params={"q": query, "count": str(limit)},
                        headers={
                            "Accept": "application/json",
                            "X-Subscription-Token": settings.brave_api_key,
                        },
                    )
            except Exception as err:  # noqa: BLE001
                raise RetryableProviderError(
                    f"Brave search: {err}",
                    retryable=True,
                ) from err

            if res.status_code == 429 or res.status_code >= 500:
                raise RetryableProviderError(
                    f"Brave search HTTP {res.status_code}",
                    status=res.status_code,
                    retryable=True,
                )
            if res.status_code >= 400:
                return []
            data = res.json()
            rows = (data.get("web") or {}).get("results") or []
            hits: list[SearchHit] = []
            for row in rows:
                url = row.get("url")
                if not url:
                    continue
                hits.append(
                    SearchHit(
                        title=row.get("title") or url,
                        url=url,
                        snippet=row.get("description"),
                    )
                )
                if len(hits) >= limit:
                    break
            return hits

        return with_backoff(_call, retries=settings.limits.retries)
