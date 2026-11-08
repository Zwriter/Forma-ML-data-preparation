"""Column details: everything about one column (FR-037)."""

import polars as pl

from forma_engine.profiling.cancellable import collect
from forma_engine.profiling.column_stats import NUMERIC
from forma_engine.profiling.distributions import top_values
from forma_engine.profiling.rejects import PHRASES, reason_expression
from forma_engine.profiling.tools.common import (
    QUARTILES,
    box_summary,
    detected_types,
    profile_column,
    shown,
)
from forma_engine.profiling.type_detection import invalid_mask

TOP_VALUES = 50
INVALID_VALUES = 10


def _text_length(frame, name, token) -> dict | None:
    length = pl.col(name).str.len_chars()
    low, high, mean = collect(
        frame.select(length.min(), length.max().alias("max"), length.mean().alias("m")),
        token,
    ).row(0)
    if low is None:
        return None
    return {"min": int(low), "max": int(high), "mean": round(mean, 2)}


def _invalid_values(frame, name, kind, dtype, token) -> list[dict]:
    if kind not in PHRASES:
        return []
    found = (
        frame.filter(invalid_mask(name, kind, dtype))
        .select(
            pl.col(name).cast(pl.String).alias("value"),
            reason_expression(name, kind).alias("reason"),
        )
        .group_by(["value", "reason"])
        .len("count")
        .sort(["count", "value"], descending=[True, False])
        .head(INVALID_VALUES)
        .select("value", "count", "reason")
    )
    return collect(found, token).to_dicts()


def column_detail(context, params: dict) -> dict:
    name = params["column"]
    kind = detected_types(context)[name]
    frame, token = context.frame, context.token
    dtype = frame.collect_schema()[name]
    column = dict(profile_column(context, name))
    if column.get("categories"):
        column["categories"] = top_values(frame, name, kind, dtype, token, TOP_VALUES)
    quartiles = None
    if kind in NUMERIC:
        box = box_summary(frame, name, kind, dtype, token)
        quartiles = box and {key: shown(box[key], kind) for key in QUARTILES}
    return {
        "column": column,
        "quartiles": quartiles,
        "text_length": _text_length(frame, name, token) if kind == "text" else None,
        "invalid_values": _invalid_values(frame, name, kind, dtype, token),
    }
