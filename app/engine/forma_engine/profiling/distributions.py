"""Bounded distribution summaries: histograms for numbers and dates, top text values."""

from datetime import datetime, timezone

import polars as pl

from forma_engine.profiling.cancellable import collect
from forma_engine.profiling.report import CategorySummary, HistogramBin
from forma_engine.profiling.type_detection import parsed

BINS = 30
TOP = 10


def _iso(seconds: float) -> str:
    moment = datetime.fromtimestamp(seconds, timezone.utc).replace(tzinfo=None)
    return moment.isoformat()


def histogram(
    frame: pl.LazyFrame, name: str, kind: str, dtype, token=None
) -> list | None:
    """Up to 30 bins over the valid values; None when the column has none."""
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
    if kind == "integer" and distinct <= BINS:
        rows = collect(data.group_by("v").len().sort("v"), token).rows()
        return [HistogramBin(int(value), int(value), int(n)) for value, n in rows]
    edge = _iso if kind == "datetime" else (lambda value: value)
    if low == high:
        return [HistogramBin(edge(low), edge(high), int(count))]
    width = (high - low) / BINS
    index = ((v - low) / width).floor().clip(0, BINS - 1).cast(pl.Int32).alias("i")
    found = dict(collect(data.select(index).group_by("i").len(), token).rows())
    return [
        HistogramBin(
            edge(low + i * width),
            edge(high if i == BINS - 1 else low + (i + 1) * width),
            int(found.get(i, 0)),
        )
        for i in range(BINS)
    ]


def categories(
    frame: pl.LazyFrame, name: str, kind: str, dtype, token=None
) -> CategorySummary | None:
    """The 10 most common values (ties by value) and how many other values there are."""
    values = parsed(name, kind, dtype).cast(pl.String).alias("value")
    counts = frame.select(values).drop_nulls().group_by("value").len("count")
    counted = collect(counts, token)
    if counted.is_empty():
        return None
    top = counted.sort(["count", "value"], descending=[True, False]).head(TOP)
    return CategorySummary(
        top=top.to_dicts(),
        other_count=int(counted["count"].sum() - top["count"].sum()),
        distinct_count=counted.height,
    )
