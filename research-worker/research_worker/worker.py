"""
Long-running poll loop: claim queued research_runs from cases DB and process them.

No public HTTP. The Next.js app only inserts status=queued rows from /pb-case admin.
"""

from __future__ import annotations

import logging
import signal
import time

from research_worker.config import get_settings
from research_worker import db as cases_db
from research_worker.pipeline import run_claimed_research

log = logging.getLogger("research_worker")


class _StopFlag:
    stop = False


def run_worker_loop(*, once: bool = False) -> int:
    settings = get_settings(require_keys=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    flag = _StopFlag()

    def _handle(_sig: int, _frame: object) -> None:
        log.info("shutdown signal received")
        flag.stop = True

    signal.signal(signal.SIGINT, _handle)
    signal.signal(signal.SIGTERM, _handle)

    log.info(
        "research worker started (poll=%ss) — DB queue only, no public HTTP",
        settings.poll_interval_sec,
    )

    processed = 0
    while not flag.stop:
        with cases_db.connect(settings) as conn:
            claimed = cases_db.claim_next_queued_run(conn)
        if not claimed:
            if once:
                log.info("no queued runs")
                return 0
            time.sleep(settings.idle_sleep_sec)
            continue

        log.info(
            "claimed run=%s case=%s title=%r",
            claimed["run_id"],
            claimed["case_id"],
            claimed.get("title"),
        )
        with cases_db.connect(settings) as conn:
            status = run_claimed_research(conn, claimed, settings=settings)
        log.info("run=%s status=%s", claimed["run_id"], status)
        processed += 1
        if once:
            return 0 if status == "completed" else 1
        time.sleep(settings.poll_interval_sec)

    log.info("worker stopped after %s runs", processed)
    return 0
