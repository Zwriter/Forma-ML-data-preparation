"""One definition of column types and invalid values, shared by profiling and the
reject export so their counts always agree."""

import polars as pl

from forma_engine.profiling.cancellable import collect

THRESHOLD = 0.95
CANDIDATES = ("integer", "decimal", "datetime", "boolean")
# shortcut: ISO-style formats only; add locale formats if users report misses
DATETIME_FORMATS = (
    "%Y-%m-%d",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
    "%Y/%m/%d",
)


def _stored_type(dtype: pl.DataType) -> str:
    if dtype.is_integer():
        return "integer"
    if dtype.is_float() or dtype.is_decimal():
        return "decimal"
    if dtype.is_temporal() and dtype not in (pl.Duration, pl.Time):
        return "datetime"
    if dtype == pl.Boolean:
        return "boolean"
    return "text" if dtype == pl.String else "other"


def _parse_text(name: str, candidate: str) -> pl.Expr:
    text = pl.col(name).str.strip_chars()
    if candidate == "integer":
        return text.cast(pl.Int64, strict=False)
    if candidate == "decimal":
        return text.cast(pl.Float64, strict=False)
    if candidate == "datetime":
        return pl.coalesce(
            text.str.strptime(pl.Datetime, fmt, strict=False)
            for fmt in DATETIME_FORMATS
        )
    lowered = text.str.to_lowercase()
    return pl.when(lowered.is_in(["true", "false"])).then(lowered == "true")


def parsed(name: str, detected: str, dtype: pl.DataType) -> pl.Expr:
    """The column's values as its detected type; invalid cells become null."""
    if dtype == pl.String and detected in CANDIDATES:
        return _parse_text(name, detected)
    return pl.col(name)


def invalid_mask(name: str, detected: str, dtype: pl.DataType) -> pl.Expr:
    """True for present values that do not fit the detected type."""
    if dtype != pl.String or detected not in CANDIDATES:
        return pl.lit(False)
    return pl.col(name).is_not_null() & _parse_text(name, detected).is_null()


def detect_types(frame: pl.LazyFrame, token=None) -> dict[str, str]:
    schema = frame.collect_schema()
    types = {name: _stored_type(dtype) for name, dtype in schema.items()}
    text = [name for name, kind in types.items() if kind == "text"]
    if not text:
        return types
    counts = []
    for i, name in enumerate(text):
        counts.append(pl.col(name).count().alias(f"{i}:present"))
        counts += [
            _parse_text(name, candidate).count().alias(f"{i}:{candidate}")
            for candidate in CANDIDATES
        ]
    row = collect(frame.select(counts), token).row(0, named=True)
    for i, name in enumerate(text):
        present = row[f"{i}:present"]
        types[name] = next(
            (
                candidate
                for candidate in CANDIDATES
                if present and row[f"{i}:{candidate}"] / present >= THRESHOLD
            ),
            "text",
        )
    return types
