"""Per-column counts and summary statistics in one lazy pass."""

import polars as pl

from forma_engine.profiling.type_detection import invalid_mask, parsed

NUMERIC = {"integer", "decimal", "datetime"}
EXAMPLE_ROWS = 10_000
STATS = ("mean", "median", "std", "min", "max")


def _iso(value):
    return value.isoformat() if hasattr(value, "isoformat") else value


def _stat_expressions(i: int, name: str, kind: str, dtype) -> list[pl.Expr]:
    values = parsed(name, kind, dtype)
    spread = values.dt.epoch("s") if kind == "datetime" else values
    return [
        values.mean().alias(f"{i}:mean"),
        values.median().alias(f"{i}:median"),
        spread.std().alias(f"{i}:std"),
        values.min().alias(f"{i}:min"),
        values.max().alias(f"{i}:max"),
    ]


def column_stats(frame: pl.LazyFrame, types: dict[str, str]) -> tuple[int, dict]:
    """Row count, plus missing/invalid/unique counts and numeric stats per column."""
    schema = frame.collect_schema()
    expressions = [pl.len().alias("rows")]
    for i, (name, dtype) in enumerate(schema.items()):
        kind = types[name]
        expressions += [
            pl.col(name).null_count().alias(f"{i}:missing"),
            invalid_mask(name, kind, dtype).sum().alias(f"{i}:invalid"),
            pl.col(name).drop_nulls().n_unique().alias(f"{i}:unique"),
        ]
        if kind in NUMERIC:
            expressions += _stat_expressions(i, name, kind, dtype)
    row = frame.select(expressions).collect().row(0, named=True)
    stats = {}
    for i, name in enumerate(schema.names()):
        numeric = None
        if types[name] in NUMERIC and row[f"{i}:min"] is not None:
            numeric = {key: _iso(row[f"{i}:{key}"]) for key in STATS}
            numeric["std"] = numeric["std"] or 0.0  # one value has no spread
        stats[name] = {
            "missing": int(row[f"{i}:missing"]),
            "invalid": int(row[f"{i}:invalid"]),
            "unique": int(row[f"{i}:unique"]),
            "numeric": numeric,
        }
    return int(row["rows"]), stats


def examples(frame: pl.LazyFrame, types: dict[str, str]) -> dict[str, list[str]]:
    """Up to 3 distinct present values per column, as text, from the first rows."""
    names = [name for name, kind in types.items() if kind != "other"]
    sample = frame.head(EXAMPLE_ROWS).select(
        pl.col(name)
        .drop_nulls()
        .unique(maintain_order=True)
        .head(3)
        .cast(pl.String)
        .implode()
        for name in names
    )
    row = sample.collect().row(0, named=True) if names else {}
    return {name: list(row.get(name) or []) for name in types}
