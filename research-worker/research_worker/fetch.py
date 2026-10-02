"""Allowlisted fetch + robots.txt + prompt-injection sanitization."""

from __future__ import annotations

import re
import time
from typing import Iterable
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from research_worker.config import get_settings

DEFAULT_ALLOWLIST = (
    "www.fbi.gov",
    "api.fbi.gov",
    "www.justice.gov",
    "www.cia.gov",
    "www.archives.gov",
    "www.congress.gov",
    "www.un.org",
    "www.icc-cpi.int",
    "www.stl-tsl.org",
    "www.reuters.com",
    "apnews.com",
    "www.bbc.com",
    "www.bbc.co.uk",
    "en.wikipedia.org",
)

_robots_cache: dict[str, tuple[float, list[str]]] = {}


def get_source_allowlist(extra: Iterable[str] | None = None) -> list[str]:
    try:
        settings_extra = get_settings(require_keys=False).source_allowlist_extra
    except Exception:  # noqa: BLE001
        settings_extra = ()
    merged = set(DEFAULT_ALLOWLIST)
    merged.update(h.lower() for h in (extra or ()))
    merged.update(settings_extra)
    return sorted(merged)


def is_url_allowlisted(raw_url: str, extra: Iterable[str] | None = None) -> bool:
    try:
        u = urlparse(raw_url)
        if u.scheme not in ("https", "http"):
            return False
        host = (u.hostname or "").lower()
        return any(host == a or host.endswith(f".{a}") for a in get_source_allowlist(extra))
    except Exception:  # noqa: BLE001
        return False


def _load_robots(origin: str, client: httpx.Client) -> list[str]:
    cached = _robots_cache.get(origin)
    if cached and time.time() - cached[0] < 3600:
        return cached[1]
    try:
        res = client.get(f"{origin}/robots.txt", timeout=8.0)
        if res.status_code >= 400:
            _robots_cache[origin] = (time.time(), [])
            return []
        disallows: list[str] = []
        applies = False
        for line in res.text.splitlines():
            trimmed = line.strip()
            if re.match(r"(?i)^user-agent:\s*\*", trimmed):
                applies = True
                continue
            if re.match(r"(?i)^user-agent:", trimmed):
                applies = False
                continue
            if applies:
                m = re.match(r"(?i)^disallow:\s*(.*)$", trimmed)
                if m:
                    disallows.append(m.group(1).strip())
        _robots_cache[origin] = (time.time(), disallows)
        return disallows
    except Exception:  # noqa: BLE001
        _robots_cache[origin] = (time.time(), [])
        return []


def is_allowed_by_robots(raw_url: str, client: httpx.Client | None = None) -> bool:
    owns = client is None
    client = client or httpx.Client(follow_redirects=True)
    try:
        u = urlparse(raw_url)
        origin = f"{u.scheme}://{u.netloc}"
        disallows = _load_robots(origin, client)
        path = u.path or "/"
        for rule in disallows:
            if not rule:
                continue
            if rule == "/":
                return False
            if path.startswith(rule):
                return False
        return True
    except Exception:  # noqa: BLE001
        return False
    finally:
        if owns:
            client.close()


def sanitize_fetched_text(text: str) -> str:
    # Prefer HTML text extraction when markup present.
    if "<" in text and ">" in text:
        try:
            soup = BeautifulSoup(text, "html.parser")
            for tag in soup(["script", "style"]):
                tag.decompose()
            text = soup.get_text(" ", strip=True)
        except Exception:  # noqa: BLE001
            text = re.sub(r"<!--[\s\S]*?-->", " ", text)
            text = re.sub(r"(?is)<script[\s\S]*?</script>", " ", text)
            text = re.sub(r"(?is)<style[\s\S]*?</style>", " ", text)

    text = re.sub(
        r"(?i)(?:ignore|disregard)\s+(?:all\s+)?(?:previous|prior)\s+instructions?",
        "[filtered]",
        text,
    )
    text = re.sub(r"(?i)system\s*:\s*", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:40_000]


def fetch_allowlisted_page(
    raw_url: str,
    *,
    client: httpx.Client | None = None,
) -> dict:
    settings = get_settings(require_keys=False)
    if not is_url_allowlisted(raw_url):
        return {"ok": False, "reason": "host_not_allowlisted"}

    owns = client is None
    client = client or httpx.Client(
        follow_redirects=True,
        headers={
            "User-Agent": settings.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/json,text/plain",
        },
        timeout=15.0,
    )
    try:
        if not is_allowed_by_robots(raw_url, client):
            return {"ok": False, "reason": "robots_disallow"}
        res = client.get(raw_url)
        if res.status_code >= 400:
            return {"ok": False, "reason": f"http_{res.status_code}"}
        final_url = str(res.url)
        if not is_url_allowlisted(final_url):
            return {"ok": False, "reason": "redirect_not_allowlisted"}
        return {"ok": True, "url": final_url, "text": res.text[:120_000]}
    except Exception:  # noqa: BLE001
        return {"ok": False, "reason": "fetch_failed"}
    finally:
        if owns:
            client.close()
