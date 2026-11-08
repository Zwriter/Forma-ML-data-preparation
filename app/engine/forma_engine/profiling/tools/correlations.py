"""Pearson correlations between number columns, for Patterns (FR-041)."""

import math
from itertools import combinations

import polars as pl

from forma_engine.profiling.cancellable import collect
from forma_engine.profiling.tools.common import numeric_values

MAX_COLUMNS = 20
MIN_SHARED = 10
STRONGEST = 5


def _chosen(context) -> list[dict]:
    """Number columns, most complete first (ties keep stored order)."""
    numbers = [
        column
        for column in context.profile["columns"]
        if column["detected_type"] in ("integer", "decimal")
    ]
    return sorted(numbers, key=lambda column: -column["completeness"])


def _pair(a: str, b: str, i: int, j: int) -> list[pl.Expr]:
    both = pl.col(a).is_not_null() & pl.col(b).is_not_null()
    return [
        pl.corr(pl.col(a).filter(both), pl.col(b).filter(both)).alias(f"r{i}_{j}"),
        both.sum().alias(f"n{i}_{j}"),
    ]


def _value(found: dict, i: int, j: int):
    r = found[f"r{i}_{j}"]
    if found[f"n{i}_{j}"] < MIN_SHARED or r is None or math.isnan(r):
        return None
    return r


def correlations(context) -> dict:
    chosen = _chosen(context)
    shown = chosen[:MAX_COLUMNS]
    names = [column["name"] for column in shown]
    schema = context.frame.collect_schema()
    values = context.frame.select(
        numeric_values(c["name"], c["detected_type"], schema[c["name"]]).alias(
            c["name"]
        )
        for c in shown
    )
    pairs = list(combinations(range(len(names)), 2))
    expressions = [e for i, j in pairs for e in _pair(names[i], names[j], i, j)]
    expressions += [
        pl.col(name).count().alias(f"n{i}_{i}") for i, name in enumerate(names)
    ]
    found = collect(values.select(expressions), context.token).row(0, named=True)

    matrix = [[None] * len(names) for _ in names]
    for i in range(len(names)):
        matrix[i][i] = 1.0 if found[f"n{i}_{i}"] >= MIN_SHARED else None
    for i, j in pairs:
        matrix[i][j] = matrix[j][i] = _value(found, i, j)
    ranked = [
        {"a": names[i], "b": names[j], "r": matrix[i][j]}
        for i, j in pairs
        if matrix[i][j] is not None
    ]
    ranked.sort(key=lambda pair: -abs(pair["r"]))
    return {
        "columns": names,
        "left_out": len(chosen) - len(shown),
        "matrix": matrix,
        "strongest": ranked[:STRONGEST],
    }
