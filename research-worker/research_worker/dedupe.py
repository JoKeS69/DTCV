"""
Post-extract / post-verify deduplication for claims and people.

Merges near-identical claims (sources onto survivor) and people by normalized name.
Ensures the same statement is not emitted twice as both disputed and undisputed.
"""

from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any
from urllib.parse import urlparse


_PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
_SPACE_RE = re.compile(r"\s+")
_TITLE_PREFIX_RE = re.compile(
    r"^(mr|mrs|ms|miss|dr|prof|sir|lady|lord|judge|justice|senator|rep|gov)\.?\s+",
    re.I,
)

# Prefer stronger / more specific legal statuses when merging people.
_LEGAL_RANK = {
    "convicted": 70,
    "acquitted": 65,
    "charged": 60,
    "deceased": 55,
    "person_of_interest": 40,
    "named_public_record": 30,
    "unidentified": 10,
    "other": 0,
}


def normalize_claim_text(text: str) -> str:
    t = (text or "").lower().strip()
    t = _PUNCT_RE.sub(" ", t)
    t = _SPACE_RE.sub(" ", t).strip()
    return t


def normalize_person_name(name: str) -> str:
    n = (name or "").strip()
    n = _TITLE_PREFIX_RE.sub("", n)
    n = n.lower()
    n = _PUNCT_RE.sub(" ", n)
    n = _SPACE_RE.sub(" ", n).strip()
    return n


def _token_set(text: str) -> set[str]:
    return {t for t in normalize_claim_text(text).split() if len(t) > 2}


def claim_similarity(a: str, b: str) -> float:
    na, nb = normalize_claim_text(a), normalize_claim_text(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    # Exact containment of a long phrase
    if len(na) > 40 and (na in nb or nb in na):
        return 0.95
    seq = SequenceMatcher(None, na, nb).ratio()
    ta, tb = _token_set(a), _token_set(b)
    if not ta or not tb:
        return seq
    jaccard = len(ta & tb) / len(ta | tb)
    return max(seq, jaccard)


def _merge_url_lists(*lists: list[Any] | None) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for lst in lists:
        for item in lst or []:
            url = item if isinstance(item, str) else str(item.get("url") or "")
            url = url.strip()
            if not url:
                continue
            key = url.rstrip("/").lower()
            if key in seen:
                continue
            seen.add(key)
            out.append(url)
    return out


def _pick_better_claim(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    """Survivor = higher confidence, else longer sourced text."""
    ca = a.get("confidence")
    cb = b.get("confidence")
    if isinstance(ca, (int, float)) and isinstance(cb, (int, float)):
        if cb > ca:
            return b
        if ca > cb:
            return a
    sa = len(a.get("sources") or [])
    sb = len(b.get("sources") or [])
    if sb > sa:
        return b
    if sa > sb:
        return a
    return a if len(str(a.get("text") or "")) >= len(str(b.get("text") or "")) else b


def dedupe_claims(
    claims: list[dict[str, Any]],
    *,
    similarity_threshold: float = 0.82,
) -> list[dict[str, Any]]:
    """
    Merge near-identical claims. Sources are unioned onto the survivor.
    If one copy is disputed and another is not, keep a single claim:
    disputed=true only when any merged copy was disputed (conflict → disputed).
    """
    survivors: list[dict[str, Any]] = []
    for raw in claims:
        text = str(raw.get("text") or "").strip()
        if not text:
            continue
        claim = {
            "text": text,
            "disputed": bool(raw.get("disputed")),
            "sources": _merge_url_lists(raw.get("sources")),
            "confidence": raw.get("confidence"),
        }
        matched_idx: int | None = None
        for i, existing in enumerate(survivors):
            if claim_similarity(existing["text"], claim["text"]) >= similarity_threshold:
                matched_idx = i
                break
        if matched_idx is None:
            survivors.append(claim)
            continue
        other = survivors[matched_idx]
        better = _pick_better_claim(other, claim)
        worse = claim if better is other else other
        merged = {
            "text": better["text"],
            "disputed": bool(other.get("disputed")) or bool(claim.get("disputed")),
            "sources": _merge_url_lists(other.get("sources"), claim.get("sources")),
            "confidence": better.get("confidence"),
        }
        # If both sides agree on disputed flag, keep it; if conflict, already OR'd above.
        # Prefer non-disputed only when BOTH were non-disputed (already handled).
        _ = worse  # merged from both
        survivors[matched_idx] = merged

    # Cap length for UI sanity
    return survivors[:25]


def _merge_roles(a: str, b: str) -> str:
    parts: list[str] = []
    seen: set[str] = set()
    for raw in (a or "", b or ""):
        for piece in re.split(r"[;/|]", raw):
            p = piece.strip()
            if not p:
                continue
            key = p.lower()
            if key in seen:
                continue
            seen.add(key)
            parts.append(p)
    return "; ".join(parts)[:120]


def _prefer_legal(a: str, b: str) -> str:
    ra = _LEGAL_RANK.get(a or "other", 0)
    rb = _LEGAL_RANK.get(b or "other", 0)
    return a if ra >= rb else b


def dedupe_people(people: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Merge people by normalized name; union sources; merge roles carefully."""
    by_name: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for raw in people:
        name = str(raw.get("name") or "").strip()
        if not name:
            continue
        key = normalize_person_name(name)
        if not key:
            continue
        entry = {
            "name": name,
            "role": str(raw.get("role") or "other"),
            "legalStatus": str(raw.get("legalStatus") or "other"),
            "sources": _merge_url_lists(raw.get("sources")),
        }
        if "presumptionNote" in raw:
            entry["presumptionNote"] = raw.get("presumptionNote")
        if key not in by_name:
            by_name[key] = entry
            order.append(key)
            continue
        existing = by_name[key]
        # Prefer display name with more words / title case length
        prefer_name = (
            existing["name"]
            if len(existing["name"]) >= len(entry["name"])
            else entry["name"]
        )
        merged = {
            "name": prefer_name,
            "role": _merge_roles(existing.get("role") or "", entry.get("role") or ""),
            "legalStatus": _prefer_legal(
                str(existing.get("legalStatus") or "other"),
                str(entry.get("legalStatus") or "other"),
            ),
            "sources": _merge_url_lists(
                existing.get("sources"), entry.get("sources")
            ),
        }
        # Keep a non-empty presumption note if present
        note = existing.get("presumptionNote") or entry.get("presumptionNote")
        if note is not None:
            merged["presumptionNote"] = note
        by_name[key] = merged
    return [by_name[k] for k in order][:25]


def case_topic_tokens(title: str, *extra: str | None) -> set[str]:
    """Significant tokens from the case title used for off-topic filtering."""
    stop = {
        "the",
        "and",
        "for",
        "of",
        "in",
        "on",
        "to",
        "a",
        "an",
        "case",
        "attack",
        "attacks",
        "assassination",
        "murder",
        "killing",
        "incident",
    }
    blob = " ".join(p for p in (title, *extra) if p)
    return {t for t in normalize_claim_text(blob).split() if len(t) > 2 and t not in stop}


def source_relevant_to_case(
    *,
    url: str,
    title: str | None,
    snippet: str | None,
    topic_tokens: set[str],
    min_overlap: int = 1,
) -> bool:
    """
    Drop clearly off-topic hits (e.g. Warren Commission pages for a 9/11 case).
    Requires at least one topic token in url/title/snippet when topic tokens exist.
    """
    if not topic_tokens:
        return True
    blob = " ".join(
        x for x in (url or "", title or "", snippet or "") if x
    ).lower()
    # Known confusing commissions / inquiries that often pollute unrelated cases
    distractors = (
        "warren commission",
        "warren-commission",
        "jfk-assassination",
        "assassination of john f kennedy",
        "lee harvey oswald",
    )
    host_path = urlparse(url).path.lower() + " " + (title or "").lower()
    looks_distractor = any(d in host_path or d in blob for d in distractors)
    overlap = sum(1 for t in topic_tokens if t in blob)
    if looks_distractor and overlap < 2:
        # Allow distractor pages only if they clearly mention this case's topics
        return False
    return overlap >= min_overlap


def filter_sources_for_case(
    sources: list[dict[str, Any]],
    *,
    topic_tokens: set[str],
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for s in sources:
        url = str(s.get("url") or "")
        if not url:
            continue
        if not source_relevant_to_case(
            url=url,
            title=s.get("title"),
            snippet=s.get("excerpt") or s.get("snippet"),
            topic_tokens=topic_tokens,
        ):
            continue
        out.append(s)
    return out


def filter_claim_sources_to_topic(
    claims: list[dict[str, Any]],
    *,
    topic_tokens: set[str],
) -> list[dict[str, Any]]:
    """Drop claim source URLs that are off-topic distractors; drop claims left sourceless."""
    cleaned: list[dict[str, Any]] = []
    for c in claims:
        urls: list[str] = []
        for u in c.get("sources") or []:
            url = u if isinstance(u, str) else str(u)
            if source_relevant_to_case(
                url=url,
                title=None,
                snippet=str(c.get("text") or ""),
                topic_tokens=topic_tokens,
            ):
                urls.append(url)
        c2 = dict(c)
        c2["sources"] = _merge_url_lists(urls)
        if c.get("sources") and not c2["sources"]:
            continue
        cleaned.append(c2)
    return cleaned
