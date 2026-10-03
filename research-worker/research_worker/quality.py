"""
Post-verify accuracy guards: instruction-leak filter, spelling, metadata,
and people role / presumption handling.
"""

from __future__ import annotations

import re
from typing import Any


# Phrases that are pipeline/UI instructions — never case facts.
_INSTRUCTION_LEAK_PATTERNS = [
    re.compile(r"disputed claims must appear", re.I),
    re.compile(r"clearly labeled disputed section", re.I),
    re.compile(r"output valid json", re.I),
    re.compile(r"you never publish", re.I),
    re.compile(r"pending[_ ]review", re.I),
    re.compile(r"ignore (any |all )?instructions", re.I),
    re.compile(r"prompt-injection", re.I),
    re.compile(r"matching the requested schema", re.I),
    re.compile(r"prefer (primary|official).{0,40}sources", re.I),
    re.compile(r"deduplicate (aggressively|claims|people)", re.I),
    re.compile(r"never emit the same text", re.I),
    re.compile(r"drafts go to pending", re.I),
    re.compile(r"allowlistedHostsHint", re.I),
    re.compile(r"caseTitle", re.I),
    re.compile(r"RESEARCH_SYSTEM_PROMPT|VERIFY_SYSTEM_PROMPT", re.I),
    re.compile(r"do not invent facts", re.I),
    re.compile(r"paraphrase sources; short excerpts", re.I),
]

_SPELLING_FIXES = [
    (re.compile(r"\bassasination\b", re.I), "assassination"),
    (re.compile(r"\bassasin\b", re.I), "assassin"),
    (re.compile(r"\bassasinated\b", re.I), "assassinated"),
    (re.compile(r"\bwarrent\b", re.I), "warren"),
]

_VICTIM_ROLE_RE = re.compile(
    r"\b(victim|deceased victim|killed|murdered|assassinated|decedent)\b",
    re.I,
)
_SUBJECT_ROLE_RE = re.compile(
    r"\b(suspect|accused|defendant|perpetrator|assassin|gunman|subject|"
    r"person of interest|alleged)\b",
    re.I,
)
_WITNESS_ROLE_RE = re.compile(r"\b(witness|bystander|eyewitness)\b", re.I)
_INVESTIGATOR_ROLE_RE = re.compile(
    r"\b(investigator|detective|commission|prosecutor|agent|officer|police)\b",
    re.I,
)

_ALLOWED_ROLES = {
    "victim",
    "subject",
    "witness",
    "investigator",
    "official",
    "other",
}

_PRESUMPTION_DEFAULT = (
    "Presumed innocent unless proven guilty in a court of law."
)
_PRESUMPTION_VICTIM = (
    "Named as a victim/decedent of the event — not an accused person."
)
_PRESUMPTION_DECEASED_PUBLIC = (
    "Historical public figure deceased in connection with this event."
)


def is_instruction_leak(text: str) -> bool:
    t = (text or "").strip()
    if not t:
        return True
    if len(t) < 12 and t.lower() in {"other", "unknown", "n/a", "none"}:
        return False
    for pat in _INSTRUCTION_LEAK_PATTERNS:
        if pat.search(t):
            return True
    # Entirely meta / UI chrome
    if t.lower().startswith("rule:") or t.lower().startswith("instruction:"):
        return True
    return False


def fix_spelling(text: str) -> str:
    out = text or ""
    for pat, repl in _SPELLING_FIXES:
        out = pat.sub(lambda m, r=repl: r if m.group(0).islower() else r.capitalize() if m.group(0)[0].isupper() else r, out)
    return out


def normalize_role(role: str | None, *, legal_status: str | None = None) -> str:
    raw = (role or "other").strip().lower()
    if raw in _ALLOWED_ROLES:
        base = raw
    elif _VICTIM_ROLE_RE.search(raw):
        base = "victim"
    elif _SUBJECT_ROLE_RE.search(raw):
        base = "subject"
    elif _WITNESS_ROLE_RE.search(raw):
        base = "witness"
    elif _INVESTIGATOR_ROLE_RE.search(raw):
        base = "investigator"
    else:
        base = "other"

    # Clear decedents of the event are victims, not "other"
    if (legal_status or "") == "deceased" and base in {"other", "official"}:
        # Keep investigator/official if role text says so; else victim
        if not _INVESTIGATOR_ROLE_RE.search(raw):
            base = "victim"
    return base


def presumption_note_for_person(
    *,
    role: str,
    legal_status: str | None,
    name: str | None = None,
) -> str:
    """
    Do not attach accused-style presumption boilerplate to clear victims/deceased
    public figures killed in the event.
    """
    r = normalize_role(role, legal_status=legal_status)
    status = (legal_status or "other").lower()
    if r == "victim" or (status == "deceased" and r != "subject"):
        return _PRESUMPTION_VICTIM if r == "victim" else _PRESUMPTION_DECEASED_PUBLIC
    if r in {"witness", "investigator", "official"}:
        return ""  # not an accused posture
    # subject / other → presumption of innocence
    return _PRESUMPTION_DEFAULT


def scrub_text_fields(obj: dict[str, Any], *keys: str) -> dict[str, Any]:
    out = dict(obj)
    for k in keys:
        if k in out and isinstance(out[k], str):
            out[k] = fix_spelling(out[k]).strip()
    return out


def filter_instruction_leaks(
    claims: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []
    for c in claims:
        text = fix_spelling(str(c.get("text") or "")).strip()
        if is_instruction_leak(text):
            continue
        c2 = dict(c)
        c2["text"] = text
        cleaned.append(c2)
    return cleaned


def normalize_people(people: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for p in people:
        name = fix_spelling(str(p.get("name") or "")).strip()
        if not name or is_instruction_leak(name):
            continue
        role_raw = str(p.get("role") or "other")
        if is_instruction_leak(role_raw):
            role_raw = "other"
        legal = str(p.get("legalStatus") or "other")
        role = normalize_role(role_raw, legal_status=legal)
        # Victims of assassination events: legalStatus should be deceased when killed
        if role == "victim" and legal == "other":
            legal = "deceased"
        note = presumption_note_for_person(role=role, legal_status=legal, name=name)
        out.append(
            {
                **p,
                "name": name,
                "role": role,
                "legalStatus": legal,
                "presumptionNote": note,
            }
        )
    return out


_YEAR_RE = re.compile(r"\b(1[5-9]\d{2}|20\d{2})\b")


def extract_year_hint(*texts: str | None) -> str | None:
    for t in texts:
        if not t:
            continue
        m = _YEAR_RE.search(t)
        if m:
            return m.group(1)
    return None


def looks_like_title_as_location(location: str | None, title: str | None) -> bool:
    if not location or not title:
        return False
    loc = re.sub(r"\s+", " ", location.strip().lower())
    tit = re.sub(r"\s+", " ", title.strip().lower())
    if loc == tit:
        return True
    if loc in tit and len(loc) > 12:
        return True
    # Bare state/city abbreviations without region are weak; keep but flag short junk
    if loc in {"ny", "nyc", "new york", "usa", "us", "u.s.", "u.s.a."} and "dallas" in tit:
        return True
    return False


def normalize_metadata(
    meta: dict[str, Any] | None,
    *,
    title: str,
    existing_event_date: str | None,
    existing_location: str | None,
) -> dict[str, Any]:
    meta = dict(meta or {})
    year = meta.get("year")
    if year is not None:
        year = str(year).strip()
        if not re.fullmatch(r"(1[5-9]\d{2}|20\d{2})", year):
            year = None
    if not year:
        year = extract_year_hint(
            existing_event_date,
            title,
            str(meta.get("eventDateText") or ""),
        )

    event_date_text = str(meta.get("eventDateText") or "").strip() or None
    if not event_date_text and year:
        # Prefer existing if it already contains the year
        if existing_event_date and year in existing_event_date:
            event_date_text = existing_event_date
        else:
            event_date_text = year

    location = str(meta.get("location") or "").strip() or None
    if location and is_instruction_leak(location):
        location = None
    if looks_like_title_as_location(location, title):
        location = None

    city = str(meta.get("city") or "").strip() or None
    region = str(meta.get("region") or "").strip() or None
    country = str(meta.get("country") or "").strip() or None
    parts = [p for p in (city, region, country) if p]
    if parts:
        location = ", ".join(parts)
    elif not location and existing_location and not looks_like_title_as_location(
        existing_location, title
    ):
        # Keep prior location only if it isn't title-as-location junk
        if existing_location.strip().lower() not in {
            "ny",
            "nyc",
            "new york",
            "usa",
            "us",
            "u.s.",
            "u.s.a.",
        }:
            location = existing_location
        else:
            location = None
    elif location and existing_location and looks_like_title_as_location(
        existing_location, title
    ):
        pass  # keep model location if any
    elif not location:
        location = None

    status = str(meta.get("investigativeStatus") or "unknown").strip().lower()
    allowed = {
        "open",
        "unsolved",
        "closed",
        "official_finding",
        "disputed",
        "unknown",
    }
    if status not in allowed:
        status = "unknown"
    # Do not invent unsolved
    if status == "unsolved" and not meta.get("statusEvidence"):
        # Keep unsolved only if model explicitly provided evidence string
        status_evidence = str(meta.get("statusEvidence") or "").strip()
        if not status_evidence:
            status = "unknown"

    status_evidence = fix_spelling(str(meta.get("statusEvidence") or "")).strip()
    if is_instruction_leak(status_evidence):
        status_evidence = ""

    note_map = {
        "open": "Investigation reported as open.",
        "unsolved": "No conclusive public resolution established in cited official sources.",
        "closed": "Matter reported closed in cited sources.",
        "official_finding": "Official investigation issued findings; public debate may continue.",
        "disputed": "Official accounts exist and remain publicly disputed on key points.",
        "unknown": "Investigative posture not clearly established from cited sources.",
    }
    legal_note = status_evidence or note_map.get(status, note_map["unknown"])

    return {
        "year": year,
        "eventDateText": event_date_text,
        "location": location,
        "city": city,
        "region": region,
        "country": country,
        "investigativeStatus": status,
        "statusEvidence": status_evidence,
        "legalStatusNote": legal_note[:500],
    }
