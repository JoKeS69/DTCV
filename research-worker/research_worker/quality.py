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
    r"\b(victim|deceased victim|murder victim|civilian (victim|casualty)|"
    r"decedent)\b",
    re.I,
)
_SUBJECT_ROLE_RE = re.compile(
    r"\b(suspect|accused|defendant|perpetrator|assassin|gunman|subject|"
    r"person of interest|alleged|hijacker|terrorist|attacker|organizer|"
    r"mastermind|plotter|conspirator|bomber|shooter|militant|extremist)\b",
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


def _name_overlaps_case_title(name: str, title: str | None) -> bool:
    if not name or not title:
        return False
    stop = {
        "the",
        "and",
        "of",
        "in",
        "on",
        "a",
        "an",
        "attacks",
        "attack",
        "assassination",
        "murder",
        "case",
        "incident",
    }
    nt = {
        t
        for t in re.sub(r"[^\w\s]", " ", name.lower()).split()
        if len(t) > 2 and t not in stop
    }
    tt = {
        t
        for t in re.sub(r"[^\w\s]", " ", title.lower()).split()
        if len(t) > 2 and t not in stop
    }
    if not nt or not tt:
        return False
    return len(nt & tt) >= 1


def normalize_role(
    role: str | None,
    *,
    legal_status: str | None = None,
    name: str | None = None,
    case_title: str | None = None,
) -> str:
    raw = (role or "other").strip().lower()
    blob = f"{raw} {name or ''}"

    # Subjects/attackers first — never auto-label as victim just because deceased.
    if raw == "subject" or _SUBJECT_ROLE_RE.search(blob):
        return "subject"
    if raw in _ALLOWED_ROLES and raw not in {"other"}:
        # Explicit victim from the model: keep only if name fits the case title
        # or no title was provided. Otherwise demote mistaken attacker→victim.
        if raw == "victim" and case_title and name:
            if not _name_overlaps_case_title(name, case_title):
                if re.search(
                    r"\b(attack|attacks|terror|hijack|bombing)\b",
                    case_title,
                    re.I,
                ):
                    return "subject"
        return raw
    if _VICTIM_ROLE_RE.search(raw):
        return "victim"
    if _WITNESS_ROLE_RE.search(raw):
        return "witness"
    if _INVESTIGATOR_ROLE_RE.search(raw):
        return "investigator"

    # Auto-victim only when deceased + name appears in the case title (e.g. JFK).
    if (legal_status or "") == "deceased" and raw in {"other", "official", ""}:
        if case_title and name and _name_overlaps_case_title(name, case_title):
            return "victim"
        if not case_title:
            return "victim"
    return "other" if raw not in _ALLOWED_ROLES else raw


def presumption_note_for_person(
    *,
    role: str,
    legal_status: str | None,
    name: str | None = None,
    case_title: str | None = None,
) -> str:
    """
    Do not attach accused-style presumption boilerplate to clear victims.
    Subjects (including deceased attackers) are not VICTIMs.
    """
    r = normalize_role(
        role, legal_status=legal_status, name=name, case_title=case_title
    )
    status = (legal_status or "other").lower()
    if r == "victim":
        return _PRESUMPTION_VICTIM
    if r == "subject":
        if status == "deceased":
            return "Named in connection with the event as a subject — not a victim."
        return _PRESUMPTION_DEFAULT
    if status == "deceased" and r != "subject":
        return _PRESUMPTION_DECEASED_PUBLIC
    if r in {"witness", "investigator", "official"}:
        return ""
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


def normalize_people(
    people: list[dict[str, Any]],
    *,
    case_title: str | None = None,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for p in people:
        name = fix_spelling(str(p.get("name") or "")).strip()
        if not name or is_instruction_leak(name):
            continue
        role_raw = str(p.get("role") or "other")
        if is_instruction_leak(role_raw):
            role_raw = "other"
        legal = str(p.get("legalStatus") or "other")
        role = normalize_role(
            role_raw, legal_status=legal, name=name, case_title=case_title
        )
        if role == "victim" and legal == "other":
            legal = "deceased"
        note = presumption_note_for_person(
            role=role, legal_status=legal, name=name, case_title=case_title
        )
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

_STATUS_CANONICAL = {"open", "closed", "dropped"}

# Legacy / model drift → open|closed|dropped
_STATUS_ALIASES = {
    "open": "open",
    "active": "open",
    "ongoing": "open",
    "unsolved": "open",  # unresolved without closure → still open posture
    "unresolved": "open",
    "unknown": "open",
    "closed": "closed",
    "solved": "closed",
    "resolved": "closed",
    "official_finding": "closed",
    "disputed": "closed",  # findings exist even if contested
    "dropped": "dropped",
    "abandoned": "dropped",
    "dismissed": "dropped",
    "nolle": "dropped",
}

_EVENT_TYPES = {
    "assassination",
    "homicide",
    "terrorist",
    "kidnapping",
    "disappearance",
    "missing",
    "other",
}


def infer_event_type(
    *,
    title: str,
    raw_event_type: str | None = None,
    status_evidence: str | None = None,
    summary: str | None = None,
) -> str:
    raw = (raw_event_type or "").strip().lower()
    if raw in _EVENT_TYPES and raw != "other":
        return raw
    blob = " ".join(
        x for x in (title, status_evidence, summary, raw) if x
    ).lower()
    if re.search(r"\bassassinat", blob):
        return "assassination"
    if re.search(r"\b(terror|terrorist|9/?11|september\s+11)\b", blob):
        return "terrorist"
    if re.search(r"\b(kidnap|abduct)", blob):
        return "kidnapping"
    if re.search(r"\bdisappear", blob):
        return "disappearance"
    if re.search(r"\bmissing\b", blob):
        return "missing"
    if re.search(r"\b(homicide|murder|killed|killing|fatal shooting)\b", blob):
        return "homicide"
    return raw if raw in _EVENT_TYPES else "other"


def canonicalize_investigative_status(
    raw: str | None,
    *,
    title: str,
    status_evidence: str | None = None,
) -> str:
    """
    Force open | closed | dropped. Never leave unsolved/unknown when avoidable.
    """
    key = (raw or "").strip().lower().replace("-", "_").replace(" ", "_")
    evidence = (status_evidence or "").lower()
    title_l = (title or "").lower()
    blob = f"{evidence} {title_l}"

    # Evidence phrases win over raw aliases
    if re.search(
        r"\b(dropped|abandoned|discontinued|nolle\s+prosequi|no\s+longer\s+pursu)\b",
        blob,
    ):
        return "dropped"
    if re.search(
        r"\b(official(?:ly)?\s+(?:closed|concluded|finding)|warren\s+commission|"
        r"special\s+tribunal|\bstl\b|convicted|judgment|verdict|case\s+closed)\b",
        blob,
    ):
        return "closed"
    if re.search(
        r"\b(ongoing|still\s+investigat|actively\s+investigat|open\s+investigation)\b",
        blob,
    ):
        return "open"

    mapped = _STATUS_ALIASES.get(key)
    if mapped == "dropped":
        return "dropped"
    if mapped == "closed":
        return "closed"
    # Explicit open from the model
    if key == "open" or key in {"active", "ongoing"}:
        return "open"

    # Vague legacy values (unsolved/unknown) on assassination titles → closed
    if re.search(r"\bassassinat", title_l):
        return "closed"

    if mapped in _STATUS_CANONICAL:
        return mapped

    return "open"


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


_SMALL_TITLE_WORDS = {
    "a",
    "an",
    "and",
    "as",
    "at",
    "by",
    "for",
    "from",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
    "vs",
    "via",
}


def _title_case_words(text: str) -> str:
    parts = re.split(r"(\s+|-|/)", text.strip())
    out: list[str] = []
    word_i = 0
    for part in parts:
        if not part or part.isspace() or part in {"-", "/"}:
            out.append(part)
            continue
        low = part.lower()
        if word_i > 0 and low in _SMALL_TITLE_WORDS:
            out.append(low)
        else:
            # Preserve initials like "J.F.K." / "F."
            if re.fullmatch(r"[A-Za-z]\.([A-Za-z]\.)+", part):
                out.append(part.upper())
            elif re.fullmatch(r"[A-Za-z]\.", part):
                out.append(part.upper())
            else:
                out.append(part[:1].upper() + part[1:].lower() if part else part)
        word_i += 1
    return "".join(out)


def normalize_case_title(
    raw: str | None,
    *,
    seed_title: str,
    event_type: str | None = None,
    people: list[dict[str, Any]] | None = None,
    year: str | None = None,
) -> str:
    """
    Produce a concise professional display title.
    Fixes spelling; prefers notable victim names; keeps short.
    """
    candidate = fix_spelling(str(raw or "").strip())
    if is_instruction_leak(candidate):
        candidate = ""
    seed = fix_spelling(str(seed_title or "").strip())

    # Prefer model title when it looks substantive
    title = candidate if len(candidate) >= 8 else seed

    # Build from event type + primary victim when seed/model is weak/typo-ish
    victim_name = None
    for p in people or []:
        role = str(p.get("role") or "").lower()
        name = str(p.get("name") or "").strip()
        if role == "victim" and name and not is_instruction_leak(name):
            victim_name = name
            break

    weak = (
        not title
        or len(title) < 8
        or title.lower() in {"case", "new case", "untitled", "test"}
    )
    # Seed/model missing assassination framing despite event type + victim
    needs_assassination_form = (
        event_type == "assassination"
        and victim_name
        and "assassination" not in title.lower()
    )
    if (weak or needs_assassination_form) and event_type == "assassination" and victim_name:
        title = f"Assassination of {victim_name}"
    elif weak and event_type == "terrorist" and seed:
        title = seed
    elif not title:
        title = seed or "Untitled case"

    title = fix_spelling(title)
    title = re.sub(r"\s+", " ", title).strip(" .")
    # Light title-case when the string is mostly lowercase / messy seed
    letters = [c for c in title if c.isalpha()]
    if letters and sum(1 for c in letters if c.islower()) / len(letters) > 0.7:
        title = _title_case_words(title)

    # Append year only when short and year known and not already present
    if year and year not in title and len(title) < 50 and event_type == "assassination":
        # Prefer without year for classic style ("Assassination of Rafik Hariri")
        pass

    return title[:120]


def normalize_metadata(
    meta: dict[str, Any] | None,
    *,
    title: str,
    existing_event_date: str | None,
    existing_location: str | None,
    people: list[dict[str, Any]] | None = None,
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

    status_evidence = fix_spelling(str(meta.get("statusEvidence") or "")).strip()
    if is_instruction_leak(status_evidence):
        status_evidence = ""

    status = canonicalize_investigative_status(
        str(meta.get("investigativeStatus") or ""),
        title=title,
        status_evidence=status_evidence,
    )

    event_type = infer_event_type(
        title=title,
        raw_event_type=str(meta.get("eventType") or "") or None,
        status_evidence=status_evidence,
    )

    generated_title = normalize_case_title(
        meta.get("generatedTitle"),
        seed_title=title,
        event_type=event_type,
        people=people,
        year=year,
    )

    note_map = {
        "open": "Investigation reported as open / ongoing.",
        "closed": "Matter reported closed or resolved with official findings in cited sources.",
        "dropped": "Investigation or prosecution reported dropped / abandoned without a closed resolution.",
    }
    legal_note = status_evidence or note_map.get(status, note_map["open"])

    return {
        "year": year,
        "eventDateText": event_date_text,
        "location": location,
        "city": city,
        "region": region,
        "country": country,
        "investigativeStatus": status,
        "statusEvidence": status_evidence,
        "eventType": event_type,
        "generatedTitle": generated_title,
        "legalStatusNote": legal_note[:500],
    }
