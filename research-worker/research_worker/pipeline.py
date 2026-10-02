"""
Case research pipeline (Python worker).

plan → search/fetch → extract → verify → corroborate → assemble → pending_review
NEVER publishes. Keys stay on the worker host only.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from research_worker.search import ResearchSearchClient
from research_worker.config import Settings, get_settings, redact_secrets
from research_worker import db as cases_db
from research_worker.fetch import (
    fetch_allowlisted_page,
    is_url_allowlisted,
    sanitize_fetched_text,
)
from research_worker.openai_client import (
    OpenAiResearchClient,
    TokenUsage,
    cost_units_from_tokens,
    empty_usage,
)
from research_worker.schema import (
    RESEARCH_SYSTEM_PROMPT,
    VERIFY_SYSTEM_PROMPT,
    ExtractResult,
    VerifyResult,
    parse_extract_strict,
    parse_verify_strict,
)
from research_worker.wording import lint_case_wording


def _push(
    log: list[dict[str, Any]],
    step: str,
    detail: str | None = None,
    url: str | None = None,
) -> None:
    entry: dict[str, Any] = {
        "at": datetime.now(timezone.utc).isoformat(),
        "step": step,
    }
    if detail is not None:
        entry["detail"] = detail
    if url is not None:
        entry["url"] = url
    log.append(entry)


def _complete_validated(
    *,
    llm: OpenAiResearchClient,
    role: str,
    schema_mode: str,
    messages: list[dict[str, str]],
    parse: Callable[[str], Any],
    schema_retries: int,
    steps: list[dict[str, Any]],
    step_name: str,
) -> tuple[Any, TokenUsage, str]:
    last_err: BaseException | None = None
    usage = empty_usage()
    model = ""
    for attempt in range(schema_retries + 1):
        result = llm.complete(
            role=role,  # type: ignore[arg-type]
            messages=messages,
            schema_mode=schema_mode,  # type: ignore[arg-type]
        )
        usage = usage.add(result.usage)
        model = result.model
        try:
            value = parse(result.content)
            return value, usage, model
        except Exception as err:  # noqa: BLE001
            last_err = err
            _push(
                steps,
                step_name,
                f"schema_reject attempt={attempt + 1}: {str(err)[:160]}",
            )
    raise last_err if last_err else RuntimeError(f"{step_name}_schema_failed")


def run_claimed_research(
    conn: Any,
    claimed: dict[str, Any],
    *,
    settings: Settings | None = None,
) -> str:
    """
    Execute pipeline for an already-claimed (status=running) research run.
    Returns 'completed' | 'failed'. Never publishes.
    """
    settings = settings or get_settings(require_keys=True)
    limits = settings.limits
    run_id = claimed["run_id"]
    case_id = claimed["case_id"]
    plan_meta = claimed.get("run_plan") or {}
    if isinstance(plan_meta, str):
        import json

        plan_meta = json.loads(plan_meta)
    actor = str(plan_meta.get("actor") or "research-worker")

    steps: list[dict[str, Any]] = []
    pages_fetched = 0
    steps_used = 0
    cost_units = 0.0
    token_usage = empty_usage()

    try:
        llm = OpenAiResearchClient(settings)
        search = ResearchSearchClient(settings)

        title = claimed["title"]
        _push(steps, "plan", f"Research plan for: {title}")
        steps_used += 1
        plan_query = " ".join(
            p
            for p in (
                title,
                claimed.get("event_date_text") or "",
                claimed.get("location") or "",
            )
            if p
        )

        _push(steps, "search", f"{search.id}: {plan_query}")
        steps_used += 1
        hits = search.search(plan_query, min(8, limits.max_pages))
        cost_units += 0.05

        pages: list[dict[str, str]] = []
        for hit in hits:
            if pages_fetched >= limits.max_pages or steps_used >= limits.max_steps:
                break
            if cost_units >= limits.max_cost:
                break
            if not is_url_allowlisted(hit.url):
                _push(steps, "skip_url", "not_allowlisted", hit.url)
                continue
            _push(steps, "fetch", hit.title, hit.url)
            fetched = fetch_allowlisted_page(hit.url)
            steps_used += 1
            if not fetched.get("ok"):
                _push(steps, "fetch_fail", str(fetched.get("reason")), hit.url)
                continue
            pages_fetched += 1
            cost_units += 0.02
            pages.append(
                {
                    "url": str(fetched["url"]),
                    "text": sanitize_fetched_text(str(fetched["text"])),
                }
            )
            _push(
                steps,
                "fetch_ok",
                f"chars={len(fetched['text'])}",
                str(fetched["url"]),
            )
            cases_db.update_run_progress(
                conn,
                run_id,
                steps_log=steps,
                pages_fetched=pages_fetched,
                steps_used=steps_used,
                cost_units=cost_units,
                prompt_tokens=token_usage.prompt_tokens,
                completion_tokens=token_usage.completion_tokens,
                total_tokens=token_usage.total_tokens,
            )

        _push(steps, "social", "skipped_no_official_api")

        _push(steps, "extract", f"pages={len(pages)}")
        steps_used += 1
        import json

        extract_value, extract_usage, extract_model = _complete_validated(
            llm=llm,
            role="extract",
            schema_mode="extract",
            schema_retries=limits.schema_retries,
            steps=steps,
            step_name="extract",
            parse=parse_extract_strict,
            messages=[
                {"role": "system", "content": RESEARCH_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "caseTitle": title,
                            "eventDateText": claimed.get("event_date_text"),
                            "location": claimed.get("location"),
                            "pages": [
                                {"url": p["url"], "text": p["text"][:6000]}
                                for p in pages
                            ],
                            "instruction": (
                                "Extract paraphrased claims/people/sources as JSON. "
                                "Prefer official sources."
                            ),
                        }
                    ),
                },
            ],
        )
        assert isinstance(extract_value, ExtractResult)
        token_usage = token_usage.add(extract_usage)
        cost_units += cost_units_from_tokens(extract_usage)
        _push(
            steps,
            "extract_ok",
            f"model={extract_model} tokens={extract_usage.total_tokens}",
        )

        _push(steps, "verify")
        steps_used += 1
        verify_value, verify_usage, verify_model = _complete_validated(
            llm=llm,
            role="verify",
            schema_mode="verify",
            schema_retries=limits.schema_retries,
            steps=steps,
            step_name="verify",
            parse=parse_verify_strict,
            messages=[
                {"role": "system", "content": VERIFY_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "caseTitle": title,
                            "extract": extract_value.model_dump(),
                            "allowlistedHostsHint": (
                                "Keep only https sources that look official/reputable; "
                                "mark disputed claims."
                            ),
                        }
                    ),
                },
            ],
        )
        assert isinstance(verify_value, VerifyResult)
        token_usage = token_usage.add(verify_usage)
        cost_units += cost_units_from_tokens(verify_usage)
        _push(
            steps,
            "verify_ok",
            f"model={verify_model} tokens={verify_usage.total_tokens}",
        )

        verified_claims = [
            c
            for c in verify_value.claims
            if not any(f.severity == "error" for f in lint_case_wording(c.text))
        ]
        verified_sources = [
            s.model_dump()
            for s in verify_value.sources
            if is_url_allowlisted(s.url)
        ]
        verified_people = [p.model_dump() for p in verify_value.people]

        _push(steps, "corroborate")
        steps_used += 1
        corroborated = []
        for c in verified_claims:
            data = c.model_dump()
            if data.get("confidence") is None:
                data["confidence"] = min(1.0, len(data.get("sources") or []) / 2.0)
            corroborated.append(data)

        _push(steps, "assemble")
        draft_content = {
            "summary": verify_value.summary or extract_value.summary,
            "assembledAt": datetime.now(timezone.utc).isoformat(),
            "pageCount": len(pages),
            "verifyNotes": verify_value.notes,
            "tokenUsage": {
                "promptTokens": token_usage.prompt_tokens,
                "completionTokens": token_usage.completion_tokens,
                "totalTokens": token_usage.total_tokens,
            },
            "note": (
                "Draft from research agent — pending admin review. Not published."
            ),
            "worker": "python-research-worker",
        }
        summary = (
            verify_value.summary
            or extract_value.summary
            or (claimed.get("summary") or "")
        )

        cases_db.complete_run_success(
            conn,
            run_id=run_id,
            case_id=case_id,
            actor=actor,
            summary=summary,
            draft_content=draft_content,
            sources=verified_sources,
            claims=corroborated,
            people=verified_people,
            steps_log=steps,
            pages_fetched=pages_fetched,
            steps_used=steps_used,
            cost_units=cost_units,
            prompt_tokens=token_usage.prompt_tokens,
            completion_tokens=token_usage.completion_tokens,
            total_tokens=token_usage.total_tokens,
            plan={
                "title": title,
                "actor": actor,
                "queries": [plan_query],
                "hitCount": len(hits),
                "models": {"extract": extract_model, "verify": verify_model},
                "worker": "python-research-worker",
            },
        )
        return "completed"
    except Exception as err:  # noqa: BLE001
        safe = redact_secrets(str(err) if err else "research_failed")
        _push(steps, "error", safe)
        cases_db.complete_run_failure(
            conn,
            run_id=run_id,
            case_id=case_id,
            actor=actor,
            error_message=safe,
            steps_log=steps,
            pages_fetched=pages_fetched,
            steps_used=steps_used,
            cost_units=cost_units,
            prompt_tokens=token_usage.prompt_tokens,
            completion_tokens=token_usage.completion_tokens,
            total_tokens=token_usage.total_tokens,
        )
        return "failed"
