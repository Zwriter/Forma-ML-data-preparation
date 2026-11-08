"""Rows with invalid values plus a reason, using the same rule as the profile counts."""

import polars as pl

from forma_engine.profiling.type_detection import invalid_mask

REASON = "reject_reason"
MAX_VALUE = 60
PHRASES = {
    "integer": "an integer",
    "decimal": "a decimal number",
    "datetime": "a date/time",
    "boolean": "a boolean",
}


def reason_column_name(names: list[str]) -> str:
    """`reject_reason`, or `reject_reason_N` with the first free N."""
    if REASON not in names:
        return REASON
    n = 1
    while f"{REASON}_{n}" in names:
        n += 1
    return f"{REASON}_{n}"


def reason_expression(name: str, kind: str) -> pl.Expr:
    """`{name}: "{value}" is not {type phrase}` for the cell, the export's wording."""
    text = pl.col(name).cast(pl.String)
    shown = pl.when(text.str.len_chars() > MAX_VALUE)
    shown = shown.then(text.str.slice(0, MAX_VALUE) + "…").otherwise(text)
    return pl.concat_str(
        [pl.lit(f'{name}: "'), shown, pl.lit(f'" is not {PHRASES[kind]}')]
    )


def rejected_rows(
    frame: pl.LazyFrame, types: dict[str, str], scope: str | None
) -> pl.LazyFrame:
    """Rows with an invalid cell in `scope` (one column, or all when None), in stored
    order, with every original column plus a reason column."""
    schema = frame.collect_schema()
    names = [name for name in schema.names() if scope in (None, name)]
    masks = {name: invalid_mask(name, types[name], schema[name]) for name in names}
    reasons = [
        pl.when(masks[name]).then(reason_expression(name, types[name]))
        for name in names
        if types[name] in PHRASES
    ]
    column = reason_column_name(schema.names())
    if not reasons:
        return frame.with_columns(pl.lit(None, pl.String).alias(column)).head(0)
    return frame.filter(pl.any_horizontal(masks.values())).with_columns(
        pl.concat_str(reasons, separator="; ", ignore_nulls=True).alias(column)
    )
