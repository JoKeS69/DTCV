"""Legal-safety wording linter (mirrors lib/pb-case/wording-linter.ts)."""

from __future__ import annotations

import re
from dataclasses import dataclass

GUILT_PATTERNS = [
    re.compile(
        r"\b(is|was|are|were)\s+(the\s+)?(killer|murderer|assassin|perpetrator|guilty)\b",
        re.I,
    ),
    re.compile(r"\bdefinitely\s+(killed|murdered|assassinated)\b", re.I),
    re.compile(r"\bwe\s+know\s+[^.]*\s+(did\s+it|is\s+guilty)\b", re.I),
    re.compile(r"\bproven\s+guilty\b(?!\s+in\s+(a\s+)?court)", re.I),
]

ACCUSATION_WITHOUT_STATUS = [
    re.compile(
        r"\b(suspect|person of interest)\b[^.]*\b(definitely|certainly|clearly)\b",
        re.I,
    ),
]

LONG_QUOTE = re.compile(r'"[^"]{400,}"')


@dataclass
class LinterFinding:
    severity: str  # error | warning
    rule: str
    message: str


def lint_case_wording(text: str) -> list[LinterFinding]:
    findings: list[LinterFinding] = []
    if not text.strip():
        return findings

    for pat in GUILT_PATTERNS:
        if pat.search(text):
            findings.append(
                LinterFinding(
                    severity="error",
                    rule="no_guilt_declaration",
                    message=(
                        "Wording appears to declare guilt. Use reported/charged/"
                        "convicted language with sources."
                    ),
                )
            )
            break

    for pat in ACCUSATION_WITHOUT_STATUS:
        if pat.search(text):
            findings.append(
                LinterFinding(
                    severity="error",
                    rule="presumption_of_innocence",
                    message=(
                        "Accusatory certainty about a named person without court status."
                    ),
                )
            )
            break

    if LONG_QUOTE.search(text):
        findings.append(
            LinterFinding(
                severity="error",
                rule="copyright_excerpt_length",
                message=(
                    "Quoted excerpt is too long. Paraphrase and link the source; "
                    "keep short excerpts only."
                ),
            )
        )

    if re.search(r"\bsupposedly\s+guilty\b", text, re.I):
        findings.append(
            LinterFinding(
                severity="warning",
                rule="weak_hedge",
                message="Prefer clear legal-status labels over informal hedges.",
            )
        )

    return findings
