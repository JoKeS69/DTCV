"""OpenAI client with structured outputs + token usage."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from openai import OpenAI

from research_worker.backoff import RetryableProviderError, with_backoff
from research_worker.config import Settings, get_settings, redact_secrets
from research_worker.schema import (
    EXTRACT_JSON_SCHEMA,
    TRENDING_SCORE_JSON_SCHEMA,
    VERIFY_JSON_SCHEMA,
)

Role = Literal["extract", "verify", "light"]
SchemaMode = Literal["extract", "verify", "trending_score"]


@dataclass
class TokenUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

    def add(self, other: "TokenUsage") -> "TokenUsage":
        return TokenUsage(
            prompt_tokens=self.prompt_tokens + other.prompt_tokens,
            completion_tokens=self.completion_tokens + other.completion_tokens,
            total_tokens=self.total_tokens + other.total_tokens,
        )


def empty_usage() -> TokenUsage:
    return TokenUsage()


def cost_units_from_tokens(usage: TokenUsage) -> float:
    return usage.total_tokens / 1_000_000.0


def _schema_for(mode: SchemaMode) -> dict[str, Any]:
    if mode == "extract":
        return {
            "type": "json_schema",
            "json_schema": {
                "name": "case_extract",
                "strict": True,
                "schema": EXTRACT_JSON_SCHEMA,
            },
        }
    if mode == "verify":
        return {
            "type": "json_schema",
            "json_schema": {
                "name": "case_verify",
                "strict": True,
                "schema": VERIFY_JSON_SCHEMA,
            },
        }
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "trending_score",
            "strict": True,
            "schema": TRENDING_SCORE_JSON_SCHEMA,
        },
    }


def _model_for(settings: Settings, role: Role) -> str:
    if role == "extract":
        return settings.openai_model_extract
    if role == "verify":
        return settings.openai_model_verify
    return settings.openai_model_light


@dataclass
class CompleteResult:
    content: str
    usage: TokenUsage
    model: str


class OpenAiResearchClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings(require_keys=True)
        if not self.settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY required on research worker only")
        timeout_s = max(1.0, self.settings.limits.timeout_ms / 1000.0)
        self._client = OpenAI(
            api_key=self.settings.openai_api_key,
            max_retries=0,
            timeout=timeout_s,
        )

    def complete(
        self,
        *,
        role: Role,
        messages: list[dict[str, str]],
        schema_mode: SchemaMode,
    ) -> CompleteResult:
        model = _model_for(self.settings, role)
        retries = self.settings.limits.retries

        def _call() -> CompleteResult:
            try:
                completion = self._client.chat.completions.create(
                    model=model,
                    temperature=0.2,
                    messages=messages,  # type: ignore[arg-type]
                    response_format=_schema_for(schema_mode),  # type: ignore[arg-type]
                )
                content = completion.choices[0].message.content or ""
                usage_raw = completion.usage
                usage = TokenUsage(
                    prompt_tokens=getattr(usage_raw, "prompt_tokens", 0) or 0,
                    completion_tokens=getattr(usage_raw, "completion_tokens", 0) or 0,
                    total_tokens=getattr(usage_raw, "total_tokens", 0) or 0,
                )
                return CompleteResult(content=content, usage=usage, model=model)
            except Exception as err:  # noqa: BLE001
                status = getattr(err, "status_code", None) or getattr(err, "status", None)
                message = redact_secrets(str(err))
                raise RetryableProviderError(
                    f"OpenAI error: {message[:200]}",
                    status=int(status) if status is not None else None,
                    retryable=(
                        status in (429, 408)
                        or (isinstance(status, int) and status >= 500)
                        or "timeout" in message.lower()
                    ),
                ) from err

        return with_backoff(_call, retries=retries)
