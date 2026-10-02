"""
Trending discovery — candidates only. Runs on the worker host (cron), not Next.js.
Uses Brave + OPENAI_MODEL_LIGHT. Never deep-researches or publishes.
"""

from __future__ import annotations

import json
import logging

from research_worker.brave import BraveSearchClient
from research_worker.config import get_settings
from research_worker import db as cases_db
from research_worker.fetch import is_url_allowlisted
from research_worker.openai_client import OpenAiResearchClient
from research_worker.schema import parse_trending_strict

log = logging.getLogger("research_worker.trending")

SEED_QUERIES = [
    "unsolved case official investigation",
    "cold case court filing",
    "missing persons public alert",
]


def run_trending_discovery(actor: str = "cron:trending") -> dict[str, int]:
    settings = get_settings(require_keys=True)
    search = BraveSearchClient(settings)
    llm = OpenAiResearchClient(settings)
    created = 0

    with cases_db.connect(settings) as conn:
        for q in SEED_QUERIES:
            hits = search.search(q, 5)
            for hit in hits:
                if not is_url_allowlisted(hit.url):
                    continue
                if cases_db.candidate_exists(conn, hit.title):
                    continue
                try:
                    result = llm.complete(
                        role="light",
                        schema_mode="trending_score",
                        messages=[
                            {
                                "role": "system",
                                "content": (
                                    "Score trending case candidates 0..1 for "
                                    "public-interest cold/unsolved investigations. "
                                    "Prefer official sources. JSON only. Never invent facts."
                                ),
                            },
                            {
                                "role": "user",
                                "content": json.dumps(
                                    {
                                        "title": hit.title,
                                        "snippet": hit.snippet or "",
                                        "url": hit.url,
                                    }
                                ),
                            },
                        ],
                    )
                    scored = parse_trending_strict(result.content)
                    score, rationale = scored.score, scored.rationale
                except Exception:  # noqa: BLE001
                    score = 0.5
                    rationale = (hit.snippet or "Discovered via trending search")[:500]

                cases_db.insert_candidate(
                    conn,
                    title=hit.title,
                    rationale=rationale,
                    score=score,
                    source_urls=[hit.url],
                )
                created += 1

        cases_db.write_audit(
            conn,
            actor=actor,
            action="trending.discovery",
            entity_type="candidate",
            entity_id=None,
            meta={"created": created, "worker": "python-research-worker"},
        )
        conn.commit()

    log.info("trending discovery created=%s", created)
    return {"created": created}
