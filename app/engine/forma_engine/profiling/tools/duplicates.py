"""Duplicate finder: duplicate rows for a chosen set of key columns (FR-040)."""

import polars as pl

from forma_engine.profiling.cancellable import collect

GROUPS = 20
SIZE = "__forma_size"


def duplicates(context, params: dict) -> dict:
    """Rows beyond the first in each group of equal keys (missing equals missing, as in
    the remove duplicates step), and the largest groups, ties by first appearance."""
    frame, token = context.frame, context.token
    keys = params.get("columns") or frame.collect_schema().names()
    repeated = (
        frame.group_by(keys, maintain_order=True)
        .agg(pl.len().alias(SIZE))
        .filter(pl.col(SIZE) > 1)
    )
    found = collect(repeated, token)
    top = found.sort(SIZE, descending=True, maintain_order=True).head(GROUPS)
    shown = top.select(
        *(pl.col(key).cast(pl.String, strict=False) for key in keys), SIZE
    )
    return {
        "columns": keys,
        "duplicate_rows": int((found[SIZE] - 1).sum()) if found.height else 0,
        "group_count": found.height,
        "groups": [
            {"values": list(row[:-1]), "size": int(row[-1])}
            for row in shown.iter_rows()
        ],
    }
