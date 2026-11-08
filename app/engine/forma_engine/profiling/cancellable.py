"""Collects a Polars query unless the job was cancelled first.

Polars cannot interrupt a running query, so this checks between queries; the job
manager makes the cancel visible at once (see JobManager.submit `abandon_on_cancel`)."""

import polars as pl

from forma_engine.domain.errors import CancelledError


def collect(query: pl.LazyFrame, token=None) -> pl.DataFrame:
    if token is not None and token():
        raise CancelledError("Profiling was cancelled.")
    return query.collect()
