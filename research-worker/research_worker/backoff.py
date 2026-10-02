"""Exponential backoff for 429 / timeout errors. Never logs secrets."""

from __future__ import annotations

import random
import time
from typing import Callable, TypeVar

T = TypeVar("T")


class RetryableProviderError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status: int | None = None,
        retryable: bool = True,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.retryable = retryable


def is_retryable_error(err: BaseException) -> bool:
    if isinstance(err, RetryableProviderError):
        return err.retryable
    status = getattr(err, "status_code", None) or getattr(err, "status", None)
    if status in (429, 408):
        return True
    if isinstance(status, int) and status >= 500:
        return True
    msg = f"{getattr(err, 'code', '')} {err} {type(err).__name__}".lower()
    return any(
        token in msg
        for token in ("timeout", "etimedout", "econnreset", "rate limit", "429")
    )


def with_backoff(
    fn: Callable[[], T],
    *,
    retries: int = 3,
    base_ms: int = 400,
    max_ms: int = 8_000,
) -> T:
    last: BaseException | None = None
    for attempt in range(retries + 1):
        try:
            return fn()
        except BaseException as err:  # noqa: BLE001 — re-raise non-retryable
            last = err
            if attempt >= retries or not is_retryable_error(err):
                raise
            delay = min(max_ms, base_ms * (2**attempt))
            jitter = random.randint(0, max(1, int(delay * 0.2)))
            time.sleep((delay + jitter) / 1000.0)
    assert last is not None
    raise last
