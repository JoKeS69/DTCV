"""
CLI entrypoints for the external research worker.

  python -m research_worker worker          # long-running DB poll loop
  python -m research_worker run-once        # process at most one queued job
  python -m research_worker trending        # cron: candidate discovery only

No public HTTP server. Admin queues jobs via /pb-case → research_runs(status=queued).
"""

from __future__ import annotations

import argparse
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="research-worker",
        description=(
            "DETECTIVE case research worker — polls cases DB for queued research_runs. "
            "Not exposed on the public website."
        ),
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("worker", help="Long-running poll loop (DB queue only)")
    sub.add_parser("run-once", help="Claim and process one queued run, then exit")
    sub.add_parser(
        "trending",
        help="Run trending candidate discovery (cron on worker host)",
    )

    args = parser.parse_args(argv)

    if args.cmd in ("worker", "run-once"):
        from research_worker.worker import run_worker_loop

        return run_worker_loop(once=args.cmd == "run-once")

    if args.cmd == "trending":
        from research_worker.trending import run_trending_discovery

        result = run_trending_discovery()
        print(result)
        return 0

    parser.error(f"unknown command: {args.cmd}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
