"""Bounded distribution summaries: histograms for numbers and dates, top text values."""

from datetime import datetime, timezone

import polars as pl

from forma_engine.profiling.cancellable import collect
from forma_engine.profiling.report import CategorySummary, HistogramBin
from forma_engine.profiling.type_detection import parsed

BINS = 30
TOP = 10


def epoch_iso(seconds: float) -> str:
    moment = datetime.fromtimestamp(seconds, timezone.utc).replace(tzinfo=None)
    return moment.isoformat()


def histogram(
    frame: pl.LazyFrame, name: str, kind: str, dtype, token=None, bins: int = BINS
) -> list | None:
    """`bins` bins (30 by default) over the valid values; integers with no more distinct
    values than bins get one bin per value. None when the column has no valid values."""
    values = parsed(name, kind, dtype)
    if kind == "datetime":
        values = values.dt.epoch("s")
    data = frame.select(values.cast(pl.Float64).alias("v")).drop_nulls()
    v = pl.col("v")
    bounds = data.select(
        v.min(), v.max().alias("hi"), v.n_unique().alias("n"), pl.len()
    )
    low, high, distinct, count = collect(bounds, token).row(0)
    if not count:
        return None
    if kind == "integer" and distinct <= bins:
        rows = collect(data.group_by("v").len().sort("v"), token).rows()
        return [HistogramBin(int(value), int(value), int(n)) for value, n in rows]
    edge = epoch_iso if kind == "datetime" else (lambda value: value)
    if low == high:
        return [HistogramBin(edge(low), edge(high), int(count))]
    width = (high - low) / bins
    index = ((v - low) / width).floor().clip(0, bins - 1).cast(pl.Int32).alias("i")
    found = dict(collect(data.select(index).group_by("i").len(), token).rows())
    return [
        HistogramBin(
            edge(low + i * width),
            edge(high if i == bins - 1 else low + (i + 1) * width),
            int(found.get(i, 0)),
        )
        for i in range(bins)
    ]


def top_values(
    frame: pl.LazyFrame, name: str, kind: str, dtype, token=None, limit: int = TOP
) -> dict | None:
    """The `limit` most common values (ties by value), how many other values there are,
    and the distinct count; None when the column has no valid values."""
    values = parsed(name, kind, dtype).cast(pl.String).alias("value")
    counts = frame.select(values).drop_nulls().group_by("value").len("count")
    counted = collect(counts, token)
    if counted.is_empty():
        return None
    top = counted.sort(["count", "value"], descending=[True, False]).head(limit)
    return {
        "top": top.to_dicts(),
        "other_count": int(counted["count"].sum() - top["count"].sum()),
        "distinct_count": counted.height,
    }


def categories(
    frame: pl.LazyFrame, name: str, kind: str, dtype, token=None
) -> CategorySummary | None:
    """The dashboard's summary: the 10 most common values and the rest."""
    found = top_values(frame, name, kind, dtype, token)
    return CategorySummary(**found) if found else None
