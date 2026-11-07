"""Helpers shared by the Profile ribbon tools."""

import polars as pl

from forma_engine.domain.errors import RequestError
from forma_engine.profiling.cancellable import collect
from forma_engine.profiling.column_stats import NUMERIC
from forma_engine.profiling.distributions import epoch_iso
from forma_engine.profiling.type_detection import parsed

QUARTILES = ("q1", "median", "q3")


def detected_types(context) -> dict[str, str]:
    """The profile's detected type per column, so tools and the profile always agree."""
    if context.profile is None:
        raise RequestError("Profile the dataset first.")
    return {
        column["name"]: column["detected_type"] for column in context.profile["columns"]
    }


def profile_column(context, name: str) -> dict:
    detected_types(context)
    return next(c for c in context.profile["columns"] if c["name"] == name)


def numeric_values(name: str, kind: str, dtype) -> pl.Expr:
    """Valid values as floats; dates and times as seconds since 1970."""
    values = parsed(name, kind, dtype)
    if kind == "datetime":
        values = values.dt.epoch("s")
    return values.cast(pl.Float64)


def shown(value, kind: str):
    """A number from `numeric_values` as the user sees it (ISO text for dates)."""
    return epoch_iso(value) if kind == "datetime" and value is not None else value


def box_summary(frame: pl.LazyFrame, name: str, kind: str, dtype, token) -> dict | None:
    """Quartiles, 1.5 × IQR fences, whiskers, and the count beyond the fences, as raw
    numbers; None when the column has no valid values."""
    if kind not in NUMERIC:
        raise RequestError("Choose a number or date column.")
    data = frame.select(numeric_values(name, kind, dtype).alias("v")).drop_nulls()
    v = pl.col("v")
    q1, median, q3 = collect(
        data.select(
            v.quantile(0.25, "linear").alias("q1"),
            v.median().alias("median"),
            v.quantile(0.75, "linear").alias("q3"),
        ),
        token,
    ).row(0)
    if q1 is None:
        return None
    spread = q3 - q1
    low, high = q1 - 1.5 * spread, q3 + 1.5 * spread
    lower, upper, outliers = collect(
        data.select(
            v.filter(v >= low).min(),
            v.filter(v <= high).max().alias("upper"),
            ((v < low) | (v > high)).sum().alias("outliers"),
        ),
        token,
    ).row(0)
    return {
        "q1": q1,
        "median": median,
        "q3": q3,
        "low": low,
        "high": high,
        "lower_whisker": lower,
        "upper_whisker": upper,
        "outliers": int(outliers),
    }
