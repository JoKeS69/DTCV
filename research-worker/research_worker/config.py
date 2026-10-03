"""
Worker configuration from environment.
OpenAI keys live here — never in the Next.js web app for research.
Search is keyless by default (Wikipedia + allowlisted DDG HTML). BRAVE_API_KEY is optional.
Cases DB is a built-in SQLite file (CASES_DATABASE_URL=file:./data/detective_cases.db).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

# Load research-worker/.env for defaults, but do NOT override vars already
# set in the shell (so `set OPENAI_API_KEY=...` wins over an empty .env line).
_env_file = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_file, override=False)


class ConfigError(RuntimeError):
    pass


def _strip_env(value: str) -> str:
    v = value.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in ('"', "'"):
        v = v[1:-1].strip()
    return v


def _req(name: str) -> str:
    value = _strip_env(os.environ.get(name) or "")
    if not value:
        raise ConfigError(f"{name} is not set (required for live research worker).")
    return value


def _opt(name: str, default: str = "") -> str:
    return _strip_env(os.environ.get(name) or default)


def _num(name: str, default: float) -> float:
    raw = _opt(name)
    if not raw:
        return default
    return float(raw)


def _int(name: str, default: int) -> int:
    return int(_num(name, default))


@dataclass(frozen=True)
class ResearchLimits:
    max_steps: int
    max_pages: int
    max_cost: float
    timeout_ms: int
    retries: int
    schema_retries: int


@dataclass(frozen=True)
class Settings:
    cases_database_url: str
    openai_api_key: str
    openai_model_extract: str
    openai_model_verify: str
    openai_model_light: str
    brave_api_key: str
    brave_search_base_url: str
    limits: ResearchLimits
    poll_interval_sec: float
    idle_sleep_sec: float
    user_agent: str
    source_allowlist_extra: tuple[str, ...]
    research_worker_token: str | None


@lru_cache(maxsize=1)
def get_settings(*, require_keys: bool = True) -> Settings:
    """
    Load settings. When require_keys=False (unit tests), OpenAI may be empty.
    BRAVE_API_KEY is never required.
    """
    cases_url = _opt("CASES_DATABASE_URL") or _opt(
        "CASES_SQLITE_PATH", "file:./data/detective_cases.db"
    )
    if require_keys and not cases_url:
        raise ConfigError(
            "CASES_DATABASE_URL is required (e.g. file:./data/detective_cases.db)."
        )

    if require_keys:
        openai_key = _req("OPENAI_API_KEY")
        extract = _req("OPENAI_MODEL_EXTRACT")
        verify = _req("OPENAI_MODEL_VERIFY")
        light = _req("OPENAI_MODEL_LIGHT")
    else:
        openai_key = _opt("OPENAI_API_KEY")
        extract = _opt("OPENAI_MODEL_EXTRACT", "gpt-4o-mini")
        verify = _opt("OPENAI_MODEL_VERIFY", "gpt-4o")
        light = _opt("OPENAI_MODEL_LIGHT", "gpt-4o-mini")

    brave = _opt("BRAVE_API_KEY")  # optional

    extra = tuple(
        h.strip().lower()
        for h in _opt("RESEARCH_SOURCE_ALLOWLIST").split(",")
        if h.strip()
    )
    token = _opt("RESEARCH_WORKER_TOKEN") or None
    schema_retries = min(2, _int("RESEARCH_SCHEMA_RETRIES", 2))

    return Settings(
        cases_database_url=cases_url,
        openai_api_key=openai_key,
        openai_model_extract=extract,
        openai_model_verify=verify,
        openai_model_light=light,
        brave_api_key=brave,
        brave_search_base_url=_opt(
            "BRAVE_SEARCH_BASE_URL",
            "https://api.search.brave.com/res/v1/web/search",
        ),
        limits=ResearchLimits(
            max_steps=_int("RESEARCH_MAX_STEPS", 12),
            max_pages=_int("RESEARCH_MAX_PAGES", 20),
            max_cost=_num("RESEARCH_MAX_COST", 5.0),
            timeout_ms=_int("RESEARCH_TIMEOUT_MS", 60_000),
            retries=_int("RESEARCH_RETRIES", 3),
            schema_retries=schema_retries,
        ),
        poll_interval_sec=_num("WORKER_POLL_INTERVAL_SEC", 5.0),
        idle_sleep_sec=_num("WORKER_IDLE_SLEEP_SEC", 5.0),
        user_agent=_opt(
            "RESEARCH_USER_AGENT",
            "DETECTIVE-CASE-NET-ResearchBot/1.0",
        ),
        source_allowlist_extra=extra,
        research_worker_token=token,
    )


def redact_secrets(message: str) -> str:
    """Strip OpenAI-looking keys from error strings before DB/logs."""
    import re

    return re.sub(r"sk-[a-zA-Z0-9._-]+", "[redacted]", message)[:500]
