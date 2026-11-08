"""Outliers outside the 1.5 × IQR fences per number or date column (FR-042)."""

import polars as pl

from forma_engine.profiling.cancellable import collect
from forma_engine.profiling.column_stats import NUMERIC
from forma_engine.profiling.tools.common import box_summary, numeric_values, shown

EXTREMES = 5


def outside(name: str, kind: str, dtype, box: dict | None) -> pl.Expr:
    """True for valid values beyond the fences; shared with the outlier rows."""
    if box is None:
        return pl.lit(False)
    value = numeric_values(name, kind, dtype)
    return (value < box["low"]) | (value > box["high"])


def _text(value: float, kind: str) -> str:
    if kind == "datetime":
        return shown(value, kind)
    return str(int(value)) if value.is_integer() else str(value)


def _column(frame, column: dict, dtype, token) -> dict | None:
    name, kind = column["name"], column["detected_type"]
    box = box_summary(frame, name, kind, dtype, token)
    if box is None:
        return None
    value = numeric_values(name, kind, dtype)
    distance = pl.max_horizontal(box["low"] - value, value - box["high"])
    furthest = collect(
        frame.filter(outside(name, kind, dtype, box))
        .select(value.alias("v"), distance.alias("d"))
        .sort("d", descending=True, maintain_order=True)
        .head(EXTREMES),
        token,
    )
    valid = collect(frame.select(value.count()), token).item()
    return {
        "column": name,
        "low": shown(box["low"], kind),
        "high": shown(box["high"], kind),
        "count": box["outliers"],
        "share": box["outliers"] / valid,
        "extremes": [_text(v, kind) for v in furthest["v"]],
        "note": "no_spread" if box["q3"] == box["q1"] else None,
    }


def anomalies(context, params: dict) -> dict:
    schema = context.frame.collect_schema()
    found = [
        _column(context.frame, column, schema[column["name"]], context.token)
        for column in context.profile["columns"]
        if column["detected_type"] in NUMERIC
    ]
    ranked = sorted((item for item in found if item), key=lambda item: -item["count"])
    return {"columns": ranked}
