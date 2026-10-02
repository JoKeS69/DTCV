"""
Keyless discovery search for the research worker.

No search-engine API key required. Default sources:
  - Wikipedia OpenSearch / MediaWiki API (official, no key)
  - Optional DuckDuckGo HTML results filtered through the source allowlist

Optional BRAVE_API_KEY: if set, Brave is used in addition (not required).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from html import unescape
from urllib.parse import urljoin

import httpx

from research_worker.backoff import RetryableProviderError, with_backoff
from research_worker.config import Settings, get_settings
from research_worker.fetch import is_url_allowlisted


@dataclass
class SearchHit:
    title: str
    url: str
    snippet: str | None = None


def _dedupe(hits: list[SearchHit], limit: int) -> list[SearchHit]:
    seen: set[str] = set()
    out: list[SearchHit] = []
    for h in hits:
        key = h.url.rstrip("/").lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(h)
        if len(out) >= limit:
            break
    return out


def _wikipedia_search(
    client: httpx.Client,
    query: str,
    limit: int,
    *,
    user_agent: str,
) -> list[SearchHit]:
    # MediaWiki OpenSearch — no API key.
    res = client.get(
        "https://en.wikipedia.org/w/api.php",
        params={
            "action": "opensearch",
            "search": query,
            "limit": str(min(limit, 10)),
            "namespace": "0",
            "format": "json",
        },
        headers={"User-Agent": user_agent, "Accept": "application/json"},
    )
    if res.status_code >= 400:
        return []
    data = res.json()
    # [query, titles[], descriptions[], urls[]]
    if not isinstance(data, list) or len(data) < 4:
        return []
    titles = data[1] or []
    descs = data[2] or []
    urls = data[3] or []
    hits: list[SearchHit] = []
    for i, url in enumerate(urls):
        if not url or not is_url_allowlisted(url):
            continue
        hits.append(
            SearchHit(
                title=titles[i] if i < len(titles) else url,
                url=url,
                snippet=descs[i] if i < len(descs) else None,
            )
        )
    return hits


def _ddg_html_search(
    client: httpx.Client,
    query: str,
    limit: int,
    *,
    user_agent: str,
) -> list[SearchHit]:
    """
    Keyless DuckDuckGo HTML endpoint. Results are filtered to the allowlist.
    Best-effort — never required; Wikipedia is the primary discovery path.
    """
    res = client.get(
        "https://html.duckduckgo.com/html/",
        params={"q": query},
        headers={
            "User-Agent": user_agent,
            "Accept": "text/html",
        },
        follow_redirects=True,
    )
    if res.status_code >= 400:
        return []
    html = res.text
    # result links: <a rel="nofollow" class="result__a" href="...">
    pattern = re.compile(
        r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
        re.I | re.S,
    )
    hits: list[SearchHit] = []
    for match in pattern.finditer(html):
        href = unescape(match.group(1))
        title = re.sub(r"<[^>]+>", "", unescape(match.group(2))).strip()
        # DDG sometimes wraps redirects — unwrap uddg=
        if "uddg=" in href:
            from urllib.parse import parse_qs, urlparse as up

            qs = parse_qs(up(href).query)
            if "uddg" in qs and qs["uddg"]:
                href = qs["uddg"][0]
        if href.startswith("/"):
            href = urljoin("https://duckduckgo.com", href)
        if not is_url_allowlisted(href):
            continue
        hits.append(SearchHit(title=title or href, url=href, snippet=None))
        if len(hits) >= limit:
            break
    return hits


def _brave_search(
    client: httpx.Client,
    query: str,
    limit: int,
    *,
    api_key: str,
    base_url: str,
) -> list[SearchHit]:
    res = client.get(
        base_url,
        params={"q": query, "count": str(limit)},
        headers={
            "Accept": "application/json",
            "X-Subscription-Token": api_key,
        },
    )
    if res.status_code == 429 or res.status_code >= 500:
        raise RetryableProviderError(
            f"Brave search HTTP {res.status_code}",
            status=res.status_code,
            retryable=True,
        )
    if res.status_code >= 400:
        return []
    rows = (res.json().get("web") or {}).get("results") or []
    hits: list[SearchHit] = []
    for row in rows:
        url = row.get("url")
        if not url or not is_url_allowlisted(url):
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


class ResearchSearchClient:
    """Default discovery: Wikipedia (+ DDG HTML allowlist filter). Brave optional."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings(require_keys=True)

    @property
    def id(self) -> str:
        if self.settings.brave_api_key:
            return "wikipedia+ddg+brave"
        return "wikipedia+ddg"

    def search(self, query: str, limit: int = 5) -> list[SearchHit]:
        settings = self.settings
        timeout_s = max(1.0, settings.limits.timeout_ms / 1000.0)
        ua = settings.user_agent

        def _call() -> list[SearchHit]:
            hits: list[SearchHit] = []
            try:
                with httpx.Client(timeout=timeout_s, follow_redirects=True) as client:
                    hits.extend(
                        _wikipedia_search(client, query, limit, user_agent=ua)
                    )
                    # Prefer site: queries toward allowlisted hosts via DDG
                    site_q = (
                        f"{query} "
                        f"(site:fbi.gov OR site:justice.gov OR site:archives.gov "
                        f"OR site:reuters.com OR site:apnews.com OR site:bbc.com "
                        f"OR site:wikipedia.org)"
                    )
                    hits.extend(
                        _ddg_html_search(client, site_q, limit, user_agent=ua)
                    )
                    if settings.brave_api_key:
                        hits.extend(
                            _brave_search(
                                client,
                                query,
                                limit,
                                api_key=settings.brave_api_key,
                                base_url=settings.brave_search_base_url,
                            )
                        )
            except RetryableProviderError:
                raise
            except Exception as err:  # noqa: BLE001
                raise RetryableProviderError(
                    f"search failed: {err}",
                    retryable=True,
                ) from err
            return _dedupe(hits, limit)

        return with_backoff(_call, retries=settings.limits.retries)


# Back-compat alias
SearchClient = ResearchSearchClient
