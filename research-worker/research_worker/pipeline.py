"""
Case research pipeline (Python worker).

plan → search/fetch → extract → verify → corroborate/dedupe → assemble → pending_review
NEVER publishes. Keys stay on the worker host only.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from research_worker.search import ResearchSearchClient
from research_worker.config import Settings, get_settings, redact_secrets
from research_worker import db as cases_db
from research_worker.dedupe import (
    case_topic_tokens,
    dedupe_claims,
    dedupe_people,
    filter_claim_sources_to_topic,
    filter_sources_for_case,
    source_relevant_to_case,
)
from research_worker.quality import (
    filter_instruction_leaks,
    fix_spelling,
    is_instruction_leak,
    normalize_metadata,
    normalize_people,
)
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
        event_date = claimed.get("event_date_text") or ""
        location = claimed.get("location") or ""
        topic_tokens = case_topic_tokens(title, event_date, location)

        _push(steps, "plan", f"Research plan for: {title}")
        steps_used += 1
        queries = search.build_queries(
            title=title,
            event_date_text=event_date or None,
            location=location or None,
        )

        _push(steps, "search", f"{search.id}: {len(queries)} queries")
        steps_used += 1
        hits = search.search_case(
            title=title,
            event_date_text=event_date or None,
            location=location or None,
            limit=min(12, limits.max_pages),
            topic_filter=topic_tokens,
        )
        cost_units += 0.05 * max(1, len(queries))
        _push(steps, "search_ok", f"hits={len(hits)} on_topic")

        pages: list[dict[str, str]] = []
        for hit in hits:
            if pages_fetched >= limits.max_pages or steps_used >= limits.max_steps:
                break
            if cost_units >= limits.max_cost:
                break
            if not is_url_allowlisted(hit.url):
                _push(steps, "skip_url", "not_allowlisted", hit.url)
                continue
            if not source_relevant_to_case(
                url=hit.url,
                title=hit.title,
                snippet=hit.snippet,
                topic_tokens=topic_tokens,
            ):
                _push(steps, "skip_url", "off_topic", hit.url)
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
                            "eventDateText": event_date or None,
                            "location": location or None,
                            "pages": [
                                {"url": p["url"], "text": p["text"][:6000]}
                                for p in pages
                            ],
                            "instruction": (
                                "Extract UNIQUE on-topic claims/people/sources as JSON. "
                                "Fill metadata (year, city/region/country, investigativeStatus). "
                                "Classify people roles (victim/subject/witness/...). "
                                "Never copy prompt/UI instructions into claim text. "
                                "Prefer primary sources about THIS case only."
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
                            "eventDateText": event_date or None,
                            "location": location or None,
                            "topicTokens": sorted(topic_tokens),
                            "extract": extract_value.model_dump(),
                            "allowlistedHostsHint": (
                                "Keep only https sources that are official/reputable AND "
                                "about this case. Drop off-topic pages (wrong event). "
                                "Merge duplicate claims/people. One statement → one claim."
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
            c.model_dump()
            for c in verify_value.claims
            if not is_instruction_leak(c.text)
            and not any(f.severity == "error" for f in lint_case_wording(c.text))
        ]
        verified_sources = [
            s.model_dump()
            for s in verify_value.sources
            if is_url_allowlisted(s.url) and not is_instruction_leak(s.title or "")
        ]
        verified_people = [p.model_dump() for p in verify_value.people]

        meta_raw = {}
        try:
            meta_raw = verify_value.metadata.model_dump()
        except Exception:  # noqa: BLE001
            try:
                meta_raw = extract_value.metadata.model_dump()
            except Exception:  # noqa: BLE001
                meta_raw = {}
        metadata = normalize_metadata(
            meta_raw,
            title=title,
            existing_event_date=event_date or None,
            existing_location=location or None,
        )

        _push(steps, "corroborate")
        steps_used += 1
        verified_sources = filter_sources_for_case(
            verified_sources, topic_tokens=topic_tokens
        )
        allowed_source_urls = {
            str(s.get("url") or "").rstrip("/").lower() for s in verified_sources
        }
        corroborated = []
        for c in verified_claims:
            data = dict(c)
            data["text"] = fix_spelling(str(data.get("text") or ""))
            srcs = []
            for u in data.get("sources") or []:
                url = u if isinstance(u, str) else str(u)
                key = url.rstrip("/").lower()
                if allowed_source_urls and key not in allowed_source_urls:
                    if not source_relevant_to_case(
                        url=url,
                        title=None,
                        snippet=str(data.get("text") or ""),
                        topic_tokens=topic_tokens,
                    ):
                        continue
                srcs.append(url)
            data["sources"] = srcs
            if not srcs:
                continue
            if data.get("confidence") is None:
                data["confidence"] = min(1.0, len(srcs) / 2.0)
            if len(srcs) < 2 and (data.get("confidence") or 0) > 0.55:
                data["confidence"] = 0.55
            corroborated.append(data)

        corroborated = filter_instruction_leaks(corroborated)
        corroborated = filter_claim_sources_to_topic(
            corroborated, topic_tokens=topic_tokens
        )
        before_claims = len(corroborated)
        corroborated = dedupe_claims(corroborated)
        verified_people = normalize_people(verified_people)
        before_people = len(verified_people)
        verified_people = dedupe_people(verified_people)
        # Re-normalize roles after merge
        verified_people = normalize_people(verified_people)
        _push(
            steps,
            "dedupe",
            (
                f"claims {before_claims}->{len(corroborated)}; "
                f"people {before_people}->{len(verified_people)}; "
                f"sources={len(verified_sources)}; "
                f"status={metadata.get('investigativeStatus')}; "
                f"year={metadata.get('year')}; loc={metadata.get('location')}"
            ),
        )

        summary = fix_spelling(
            verify_value.summary
            or extract_value.summary
            or (claimed.get("summary") or "")
        )
        if is_instruction_leak(summary):
            summary = claimed.get("summary") or title

        _push(steps, "assemble")
        draft_content = {
            "summary": summary,
            "assembledAt": datetime.now(timezone.utc).isoformat(),
            "pageCount": len(pages),
            "verifyNotes": verify_value.notes,
            "metadata": metadata,
            "tokenUsage": {
                "promptTokens": token_usage.prompt_tokens,
                "completionTokens": token_usage.completion_tokens,
                "totalTokens": token_usage.total_tokens,
            },
            "quality": {
                "dedupedClaims": len(corroborated),
                "dedupedPeople": len(verified_people),
                "topicTokens": sorted(topic_tokens),
                "investigativeStatus": metadata.get("investigativeStatus"),
            },
            "note": (
                "Draft from research agent — pending admin review. Not published."
            ),
            "worker": "python-research-worker",
        }

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
            event_date_text=metadata.get("eventDateText"),
            location=metadata.get("location"),
            legal_status_note=metadata.get("legalStatusNote"),
            plan={
                "title": title,
                "actor": actor,
                "queries": queries,
                "hitCount": len(hits),
                "models": {"extract": extract_model, "verify": verify_model},
                "worker": "python-research-worker",
                "quality": "dedupe+topic-filter+metadata",
                "metadata": metadata,
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
