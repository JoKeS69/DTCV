"""
Keyless discovery search for the research worker.

No search-engine API key required. Default sources:
  - Wikipedia OpenSearch / MediaWiki search (official, no key)
  - Direct Wikipedia title URL seeding when search is sparse
  - Optional DuckDuckGo HTML results filtered through the source allowlist

Optional BRAVE_API_KEY: if set, Brave is used in addition (not required).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from html import unescape
from urllib.parse import quote, urljoin

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


def _wiki_title_url(title: str) -> str:
    slug = title.strip().replace(" ", "_")
    return f"https://en.wikipedia.org/wiki/{quote(slug, safe=':()/._-')}"


def _wikipedia_opensearch(
    client: httpx.Client,
    query: str,
    limit: int,
    *,
    user_agent: str,
) -> list[SearchHit]:
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


def _wikipedia_fulltext_search(
    client: httpx.Client,
    query: str,
    limit: int,
    *,
    user_agent: str,
) -> list[SearchHit]:
    """MediaWiki list=search — more tolerant of short name queries than OpenSearch."""
    res = client.get(
        "https://en.wikipedia.org/w/api.php",
        params={
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srlimit": str(min(limit, 10)),
            "srnamespace": "0",
            "format": "json",
        },
        headers={"User-Agent": user_agent, "Accept": "application/json"},
    )
    if res.status_code >= 400:
        return []
    rows = ((res.json().get("query") or {}).get("search")) or []
    hits: list[SearchHit] = []
    for row in rows:
        title = str(row.get("title") or "").strip()
        if not title:
            continue
        url = _wiki_title_url(title)
        if not is_url_allowlisted(url):
            continue
        snippet = re.sub(r"<[^>]+>", "", str(row.get("snippet") or ""))
        hits.append(SearchHit(title=title, url=url, snippet=snippet or None))
        if len(hits) >= limit:
            break
    return hits


def _wikipedia_search(
    client: httpx.Client,
    query: str,
    limit: int,
    *,
    user_agent: str,
) -> list[SearchHit]:
    hits = _wikipedia_opensearch(client, query, limit, user_agent=user_agent)
    if len(hits) < max(1, limit // 2):
        hits.extend(
            _wikipedia_fulltext_search(client, query, limit, user_agent=user_agent)
        )
    return _dedupe(hits, limit)


def wikipedia_seed_hits(title: str) -> list[SearchHit]:
    """
    Always try the case title as a Wikipedia article URL so one run can fetch
    a primary page even when OpenSearch returns nothing for long queries.
    """
    variants = [
        title.strip(),
        re.sub(r"\s+", " ", title).strip(),
    ]
    # Common spelling variants (Rafic/Rafik)
    if re.search(r"\brafic\b", title, re.I):
        variants.append(re.sub(r"\bRafic\b", "Rafik", title, flags=re.I))
    if re.search(r"\brafik\b", title, re.I):
        variants.append(re.sub(r"\bRafik\b", "Rafic", title, flags=re.I))
    # Also seed the person-name article when title is "Assassination of X"
    short = re.sub(
        r"^(assassination|murder|killing)\s+of\s+",
        "",
        title,
        flags=re.I,
    ).strip()
    if short and short.lower() != title.strip().lower():
        variants.append(short)
        if re.search(r"\brafik\b", short, re.I):
            variants.append(re.sub(r"\bRafik\b", "Rafic", short, flags=re.I))
        if re.search(r"\brafic\b", short, re.I):
            variants.append(re.sub(r"\bRafic\b", "Rafik", short, flags=re.I))
    hits: list[SearchHit] = []
    for v in variants:
        if not v:
            continue
        url = _wiki_title_url(v)
        if is_url_allowlisted(url):
            hits.append(SearchHit(title=v, url=url, snippet=f"Wikipedia seed for {v}"))
    return hits


# Back-compat alias used by older call sites / pipeline seed retry
_wikipedia_seed_hits = wikipedia_seed_hits


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
    try:
        res = client.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            headers={
                "User-Agent": user_agent,
                "Accept": "text/html",
            },
            follow_redirects=True,
        )
    except Exception:  # noqa: BLE001
        return []
    if res.status_code >= 400:
        return []
    html = res.text
    pattern = re.compile(
        r'class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
        re.I | re.S,
    )
    hits: list[SearchHit] = []
    for match in pattern.finditer(html):
        href = unescape(match.group(1))
        title = re.sub(r"<[^>]+>", "", unescape(match.group(2))).strip()
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

    def build_queries(
        self,
        *,
        title: str,
        event_date_text: str | None = None,
        location: str | None = None,
    ) -> list[str]:
        """
        Short, high-recall queries first. Long date/location suffixes break
        Wikipedia OpenSearch (→ 0 hits / pages=0).
        """
        title = title.strip()
        # Strip leading "Assassination of " for a person-name query
        short = re.sub(
            r"^(assassination|murder|killing)\s+of\s+",
            "",
            title,
            flags=re.I,
        ).strip()
        queries = [
            title,
            short if short.lower() != title.lower() else "",
            f"{short} assassination" if short else "",
            f"{title} Beirut" if location and "beirut" not in title.lower() else (location or ""),
            f"{short} {event_date_text}".strip() if event_date_text else "",
            f"{title} site:wikipedia.org OR site:un.org OR site:stl-tsl.org OR site:reuters.com OR site:bbc.com",
        ]
        seen: set[str] = set()
        out: list[str] = []
        for q in queries:
            qn = " ".join(q.split()).strip()
            if not qn or qn.lower() in seen:
                continue
            seen.add(qn.lower())
            out.append(qn)
        return out

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
                    # DDG is best-effort and must not fail the whole search
                    try:
                        site_q = (
                            f"{query} "
                            f"(site:wikipedia.org OR site:un.org OR site:stl-tsl.org "
                            f"OR site:fbi.gov OR site:justice.gov OR site:archives.gov "
                            f"OR site:reuters.com OR site:apnews.com OR site:bbc.com)"
                        )
                        hits.extend(
                            _ddg_html_search(client, site_q, limit, user_agent=ua)
                        )
                    except Exception:  # noqa: BLE001
                        pass
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

        try:
            return with_backoff(_call, retries=settings.limits.retries)
        except Exception:  # noqa: BLE001
            # Last resort: never return total failure empty without wiki seed later
            return []

    def search_case(
        self,
        *,
        title: str,
        event_date_text: str | None = None,
        location: str | None = None,
        limit: int = 12,
        topic_filter: set[str] | None = None,
    ) -> list[SearchHit]:
        """Run multiple short queries, seed Wikipedia, keep on-topic allowlisted hits."""
        from research_worker.dedupe import case_topic_tokens, source_relevant_to_case

        queries = self.build_queries(
            title=title,
            event_date_text=event_date_text,
            location=location,
        )
        tokens = (
            topic_filter
            if topic_filter is not None
            else case_topic_tokens(title, event_date_text, location)
        )
        pooled: list[SearchHit] = []
        per = max(4, min(8, limit))
        for q in queries:
            pooled.extend(self.search(q, per))
        # Always seed Wikipedia title URL(s) so one run can fetch a real page
        pooled.extend(wikipedia_seed_hits(title))
        if location:
            pooled.extend(wikipedia_seed_hits(f"{title} {location}"))

        filtered: list[SearchHit] = []
        for h in pooled:
            if not is_url_allowlisted(h.url):
                continue
            # Seeds / wikipedia hits with topic tokens in URL path always pass
            if not source_relevant_to_case(
                url=h.url,
                title=h.title,
                snippet=h.snippet,
                topic_tokens=tokens,
            ):
                continue
            filtered.append(h)

        # If topic filter wiped everything, still keep Wikipedia seeds that match title tokens
        if not filtered:
            for h in pooled:
                if "wikipedia.org" in h.url and is_url_allowlisted(h.url):
                    filtered.append(h)

        return _dedupe(filtered, limit)


# Back-compat alias
SearchClient = ResearchSearchClient
