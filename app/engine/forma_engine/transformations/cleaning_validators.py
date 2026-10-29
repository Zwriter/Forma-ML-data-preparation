"""Parameter rules and data preconditions for Clean-tab operations."""

import polars as pl

from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.cleaning_operations import (
    TARGET_TYPES,
    TYPE_LABELS,
    converted,
    typed_value,
)

FILL_STRATEGIES = {"constant", "mean", "median", "mode", "previous", "next"}


def _fail(message: str):
    raise InvalidTransformationError(message)


def _is_text(schema, column: str) -> bool:
    return schema is None or schema[column] == pl.String


def _require_column(params: dict, columns: list[str]) -> str:
    column = params.get("column")
    if not isinstance(column, str) or column not in columns:
        _fail("Select an existing column.")
    return column


def _require_columns(value, columns: list[str], minimum: int, label: str):
    if (
        not isinstance(value, list)
        or len(value) < minimum
        or any(not isinstance(name, str) or name not in columns for name in value)
        or len(set(value)) != len(value)
    ):
        _fail(
            f"Select at least {minimum} existing column{'s' * (minimum > 1)} {label}."
        )
    return value


def _require_new_name(name, taken: set[str]) -> str:
    if not isinstance(name, str) or not name.strip():
        _fail("Enter a name for each new column.")
    if name in taken:
        _fail(f"A column named '{name}' already exists.")
    return name


def _require_bool(params: dict, key: str):
    if not isinstance(params.get(key), bool):
        _fail(f"{key} must be true or false.")


def _fill(params, columns, schema):
    column = _require_column(params, columns)
    strategy = params.get("strategy")
    if strategy not in FILL_STRATEGIES:
        _fail(
            "Choose a fixed value, average, median, most frequent, previous, or next."
        )
    if strategy == "constant" and "value" not in params:
        _fail("Constant fill requires a replacement value.")
    if strategy in {"mean", "median"} and schema and not schema[column].is_numeric():
        _fail("Mean and median fill require a numeric column.")


def _convert(params, columns, schema):
    _require_column(params, columns)
    if params.get("to") not in TARGET_TYPES:
        _fail("Choose a supported conversion type.")
    if params.get("on_error", "fail") not in {"fail", "null"}:
        _fail("Choose whether unconvertible values fail the step or become missing.")


def _replace(params, columns, schema):
    selected = _require_columns(params.get("columns"), columns, 1, "to search")
    find, replacement = params.get("find"), params.get("replace")
    if not isinstance(find, str):
        _fail("Enter the value to find.")
    if replacement is not None and not isinstance(replacement, str):
        _fail("The replacement must be text or a missing value.")
    if params.get("match") not in {"whole", "contains"}:
        _fail("Choose whole-cell or partial matching.")
    _require_bool(params, "case_sensitive")
    if params["match"] == "contains":
        if not find:
            _fail("Enter the text to find inside cells.")
        if any(not _is_text(schema, name) for name in selected):
            _fail("Partial matching works only on text columns.")
    elif schema and replacement is not None:
        for name in selected:
            if typed_value(replacement, schema[name]) is None:
                _fail(f"'{replacement}' is not a valid value for column '{name}'.")


def _split(params, columns, schema):
    column = _require_column(params, columns)
    if not _is_text(schema, column):
        _fail("Split works only on text columns.")
    separator, into = params.get("separator"), params.get("into")
    if not isinstance(separator, str) or not separator:
        _fail("Enter the separator to split on.")
    _require_bool(params, "drop_original")
    if not isinstance(into, list) or len(into) < 2:
        _fail("Name at least two new columns.")
    taken = set(columns) - ({column} if params["drop_original"] else set())
    for name in into:
        taken.add(_require_new_name(name, taken))


def _merge(params, columns, schema):
    sources = _require_columns(params.get("columns"), columns, 2, "to merge")
    if not isinstance(params.get("separator"), str):
        _fail("The separator must be text.")
    _require_bool(params, "drop_sources")
    removed = set(sources) if params["drop_sources"] else set()
    _require_new_name(params.get("into"), set(columns) - removed)


RULES = {
    "fill_null": _fill,
    "convert_type": _convert,
    "replace_values": _replace,
    "split_column": _split,
    "merge_columns": _merge,
}


def validate_cleaning(kind: str, params: dict, columns: list[str], schema=None):
    RULES[kind](params, columns, schema)


def check_preconditions(frame: pl.LazyFrame, operation: dict) -> None:
    """Run checks that need data, not just the schema."""
    kind, params = operation.get("type"), operation.get("parameters", {})
    if kind == "fill_null" and params["strategy"] in {"mean", "median", "mode"}:
        column = params["column"]
        values = frame.select(pl.col(column).drop_nulls().len()).collect().item()
        if not values:
            _fail(f"'{column}' has no values to calculate a fill value from.")
    if kind == "convert_type" and params.get("on_error", "fail") == "fail":
        column, target = params["column"], params["to"]
        source = frame.collect_schema()[column]
        failed = (
            frame.select(
                (
                    pl.col(column).is_not_null()
                    & converted(column, source, target).is_null()
                ).sum()
            )
            .collect()
            .item()
        )
        if failed:
            plural = "values" if failed != 1 else "value"
            _fail(
                f"{failed} {plural} in '{column}' cannot be converted to "
                f"{TYPE_LABELS[target]}."
            )
