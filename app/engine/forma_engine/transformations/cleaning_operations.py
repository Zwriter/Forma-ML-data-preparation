"""Value- and column-level cleaning operations used by the Clean tab."""

import re

import polars as pl

TARGET_TYPES = {
    "string": pl.String,
    "integer": pl.Int64,
    "float": pl.Float64,
    "boolean": pl.Boolean,
    "date": pl.Date,
}
TYPE_LABELS = {
    "string": "text",
    "integer": "whole number",
    "float": "decimal number",
    "boolean": "true/false",
    "date": "date",
}
BOOLEAN_TEXT = {
    "true": True,
    "false": False,
    "yes": True,
    "no": False,
    "1": True,
    "0": False,
}


def converted(column: str, source: pl.DataType, target: str) -> pl.Expr:
    """Return a non-strict conversion expression; failed values become null."""
    value = pl.col(column)
    if source == pl.String:
        text = value.str.strip_chars()
        if target == "boolean":
            return text.str.to_lowercase().replace_strict(
                BOOLEAN_TEXT, default=None, return_dtype=pl.Boolean
            )
        if target == "date":
            return text.str.to_date(strict=False)
        return text.cast(TARGET_TYPES[target], strict=False)
    return value.cast(TARGET_TYPES[target], strict=False)


def typed_value(text: str, dtype: pl.DataType):
    """Convert user-entered text to a value of dtype, or None when impossible."""
    if dtype == pl.String:
        return text
    if dtype == pl.Boolean:
        return BOOLEAN_TEXT.get(text.strip().lower())
    series = pl.Series("value", [text]).str.strip_chars()
    if dtype == pl.Date:
        return series.str.to_date(strict=False)[0]
    return series.cast(dtype, strict=False)[0]


def convert_type(frame: pl.LazyFrame, p: dict) -> pl.LazyFrame:
    column = p["column"]
    source = frame.collect_schema()[column]
    return frame.with_columns(converted(column, source, p["to"]).alias(column))


def fill_null(frame: pl.LazyFrame, p: dict) -> pl.LazyFrame:
    value, strategy = pl.col(p["column"]), p["strategy"]
    fills = {
        "constant": lambda: value.fill_null(p.get("value")),
        "mean": lambda: value.fill_null(value.mean()),
        "median": lambda: value.fill_null(value.median()),
        "mode": lambda: value.fill_null(value.mode().first()),
        "previous": value.forward_fill,
        "next": value.backward_fill,
    }
    return frame.with_columns(fills[strategy]())


def _pattern(find: str, case_sensitive: bool) -> str:
    return ("" if case_sensitive else "(?i)") + re.escape(find)


def _replace_expression(column: str, dtype: pl.DataType, p: dict) -> pl.Expr:
    value, find, replacement = pl.col(column), p["find"], p["replace"]
    case_sensitive = p["case_sensitive"]
    if p["match"] == "contains":
        pattern = _pattern(find, case_sensitive)
        if replacement is None:
            return (
                pl.when(value.str.contains(pattern))
                .then(pl.lit(None, dtype))
                .otherwise(value)
            )
        return value.str.replace_all(pattern, replacement.replace("$", "$$"))
    text = value.cast(pl.String)
    matches = (
        text == find if case_sensitive else text.str.to_lowercase() == find.lower()
    )
    new_value = None if replacement is None else typed_value(replacement, dtype)
    return pl.when(matches).then(pl.lit(new_value, dtype)).otherwise(value)


def replace_values(frame: pl.LazyFrame, p: dict) -> pl.LazyFrame:
    schema = frame.collect_schema()
    return frame.with_columns(
        _replace_expression(column, schema[column], p).alias(column)
        for column in p["columns"]
    )


def _insert_after(names: list[str], anchor: str, new: list[str], removed: set):
    order = []
    for name in names:
        if name not in removed:
            order.append(name)
        if name == anchor:
            order.extend(new)
    return order


def split_column(frame: pl.LazyFrame, p: dict) -> pl.LazyFrame:
    column, into = p["column"], p["into"]
    parts = pl.col(column).str.splitn(p["separator"], len(into))
    names = frame.collect_schema().names()
    removed = {column} - set(into) if p["drop_original"] else set()
    order = _insert_after(names, column, into, removed | set(into))
    return frame.with_columns(
        parts.struct.field(f"field_{index}").alias(name)
        for index, name in enumerate(into)
    ).select(order)


def merge_columns(frame: pl.LazyFrame, p: dict) -> pl.LazyFrame:
    sources, into = p["columns"], p["into"]
    merged = pl.concat_str(
        [pl.col(name).cast(pl.String).fill_null("") for name in sources],
        separator=p["separator"],
    )
    names = frame.collect_schema().names()
    last = max(sources, key=names.index)
    removed = set(sources) if p["drop_sources"] else set()
    order = _insert_after(names, last, [into], removed | {into})
    return frame.with_columns(merged.alias(into)).select(order)


OPERATIONS = {
    "convert_type": convert_type,
    "fill_null": fill_null,
    "replace_values": replace_values,
    "split_column": split_column,
    "merge_columns": merge_columns,
}
