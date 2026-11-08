"""Recommended Clean steps from the latest profile, by the fixed rules of FR-043."""

from forma_engine.profiling.tools.common import detected_types
from forma_engine.transformations.cleaning_operations import TYPE_LABELS

FILL_AT_MOST = 0.2
EMPTY_ABOVE = 0.9
# detected type -> convert_type target
TARGETS = {
    "integer": "integer",
    "decimal": "float",
    "datetime": "date",
    "boolean": "boolean",
}
NUMBERS = {"integer", "decimal"}


def _empty(column: dict, rows: int) -> bool:
    return rows > 0 and column["missing_count"] / rows > EMPTY_ABOVE


def _constant(column: dict, rows: int) -> bool:
    return column["unique_count"] == 1 and rows - column["missing_count"] > 1


def dropped_columns(profile: dict) -> set[str]:
    """Columns a Drop recommendation removes; other suggestions leave them alone so
    every suggestion can be added and applied together."""
    rows = profile["row_count"]
    return {
        c["name"] for c in profile["columns"] if _empty(c, rows) or _constant(c, rows)
    }


def _suggestion(kind, column, title, detail, cells, steps) -> dict:
    return {
        "id": f"{kind}:{column}" if column else kind,
        "kind": kind,
        "title": title,
        "detail": detail,
        "cells_affected": cells,
        "steps": steps,
        "examples": None,
    }


def _convert_step(column: dict) -> dict | None:
    target = TARGETS.get(column["detected_type"])
    if column["stored_type"] != "String" or target is None:
        return None
    parameters = {"column": column["name"], "to": target, "on_error": "null"}
    return {"type": "convert_type", "parameters": parameters}


def _for_column(column: dict, rows: int) -> list[dict]:
    name, kind = column["name"], column["detected_type"]
    missing, present = column["missing_count"], rows - column["missing_count"]
    if _empty(column, rows):
        detail = f"{missing / rows:.1%} of values are missing."
        step = {"type": "drop_columns", "parameters": {"columns": [name]}}
        return [_suggestion("drop_empty", name, f"Drop {name}", detail, rows, [step])]
    if _constant(column, rows):
        detail = f"Every present value is {column['examples'][0]}."
        step = {"type": "drop_columns", "parameters": {"columns": [name]}}
        return [
            _suggestion("drop_constant", name, f"Drop {name}", detail, rows, [step])
        ]
    found = []
    convert = _convert_step(column)
    if convert:
        invalid, label = column["invalid_count"], TYPE_LABELS[TARGETS[kind]]
        detail = (
            f"{present} values are stored as text but hold {label}s; "
            f"{invalid} invalid values will become missing."
        )
        title = f"Convert {name} to {label}"
        found.append(_suggestion("convert", name, title, detail, present, [convert]))
    if 0 < missing <= FILL_AT_MOST * rows:
        strategy = "median" if kind in NUMBERS else "mode"
        label = "the median" if strategy == "median" else "the most frequent value"
        detail = f"{missing} missing ({missing / rows:.1%}); fill with {label}."
        fill = {
            "type": "fill_null",
            "parameters": {"column": name, "strategy": strategy},
        }
        steps = [convert, fill] if convert else [fill]
        title = f"Fill missing values in {name}"
        found.append(_suggestion("fill_missing", name, title, detail, missing, steps))
    return found


def recommendations(context) -> list[dict]:
    detected_types(context)  # refuses when there is no profile yet
    profile = context.profile
    rows = profile["row_count"]
    found = [s for column in profile["columns"] for s in _for_column(column, rows)]
    duplicates = profile["duplicate_rows"]
    if duplicates:
        detail = f"{duplicates} rows repeat an earlier row in every column."
        step = {"type": "drop_duplicates", "parameters": {}}
        cells = duplicates * len(profile["columns"])
        title = "Remove duplicate rows"
        found.append(
            _suggestion("remove_duplicates", None, title, detail, cells, [step])
        )
    return sorted(found, key=lambda item: -item["cells_affected"])
