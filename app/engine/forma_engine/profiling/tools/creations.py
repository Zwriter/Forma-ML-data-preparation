"""Suggested new columns: date parts and splits (FR-044)."""

import polars as pl

from forma_engine.profiling.cancellable import collect
from forma_engine.profiling.tools.common import detected_types
from forma_engine.profiling.tools.recommendations import dropped_columns
from forma_engine.transformations.cleaning_operations import (
    DATE_PARTS,
    extract_date_parts,
    split_column,
)

SEPARATORS = (", ", ",", ";", "|", "/", " - ", " ")
MAX_SEPARATORS = 3
SAME_SHARE = 0.95
EXAMPLES = 3


def _free(name: str, taken: set[str]) -> str:
    """The name, or the name with the next free number."""
    found, number = name, 0
    while found in taken:
        number += 1
        found = f"{name}_{number}"
    taken.add(found)
    return found


def _numbered(stem: str, count: int, taken: set[str]) -> list[str]:
    """`count` names `{stem}_{n}` with the lowest free numbers."""
    names, number = [], 0
    while len(names) < count:
        number += 1
        if f"{stem}_{number}" not in taken:
            names.append(f"{stem}_{number}")
    taken.update(names)
    return names


def _examples(frame, name, operation, parameters, new, token) -> list[dict]:
    """The step itself run on the first present values, so examples match the result."""
    sample = frame.select(name).drop_nulls().head(EXAMPLES)
    result = collect(operation(sample, parameters), token)
    text = result.select(pl.all().cast(pl.String))
    return [
        {"before": row[name], "after": [row[column] for column in new]}
        for row in text.iter_rows(named=True)
    ]


def _creation(kind, name, title, detail, cells, step, examples) -> dict:
    return {
        "id": f"{kind}:{name}",
        "kind": kind,
        "title": title,
        "detail": detail,
        "cells_affected": cells,
        "steps": [step],
        "examples": examples,
    }


def _date_parts(frame, column: dict, present: int, taken, token) -> dict:
    name = column["name"]
    parts = list(DATE_PARTS)
    names = {part: _free(f"{name}_{part}", taken) for part in parts}
    parameters = {"column": name, "parts": parts, "names": names}
    new = list(names.values())
    examples = _examples(frame, name, extract_date_parts, parameters, new, token)
    detail = f"Adds year, month, day, and weekday (Monday = 1) for {present} dates."
    step = {"type": "extract_date_parts", "parameters": parameters}
    title = f"Extract date parts from {name}"
    return _creation("date_parts", name, title, detail, present * 4, step, examples)


def _split_rule(frame, names: list[str], token) -> dict[str, tuple[str, int]]:
    """Per text column, the first separator that at least 95% of present values hold
    the same number of times (1 to 3)."""
    if not names:
        return {}
    counts = [
        (pl.col(name).str.count_matches(sep, literal=True) == times)
        .sum()
        .truediv(pl.col(name).count())
        .alias(f"{i}|{j}|{times}")
        for i, name in enumerate(names)
        for j, sep in enumerate(SEPARATORS)
        for times in range(1, MAX_SEPARATORS + 1)
    ]
    shares = collect(frame.select(counts), token).row(0, named=True)
    found = {}
    for key, share in shares.items():
        i, j, times = (int(part) for part in key.split("|"))
        if share is not None and share >= SAME_SHARE and names[i] not in found:
            found[names[i]] = (SEPARATORS[j], times)
    return found


def _split(frame, name, separator, times, present, taken, token) -> dict:
    into = _numbered(name, times + 1, taken)
    parameters = {
        "column": name,
        "separator": separator,
        "into": into,
        "drop_original": False,
    }
    examples = _examples(frame, name, split_column, parameters, into, token)
    detail = f'Splits {present} values on "{separator}" into {len(into)} columns.'
    step = {"type": "split_column", "parameters": parameters}
    cells = present * len(into)
    return _creation("split", name, f"Split {name}", detail, cells, step, examples)


def creations(context) -> list[dict]:
    detected_types(context)  # refuses when there is no profile yet
    frame, token, profile = context.frame, context.token, context.profile
    skipped = dropped_columns(profile)
    columns = [c for c in profile["columns"] if c["name"] not in skipped]
    taken = {c["name"] for c in profile["columns"]}
    rows = profile["row_count"]
    text = [c["name"] for c in columns if c["detected_type"] == "text"]
    splits = _split_rule(frame, text, token)
    found = []
    for column in columns:
        name, present = column["name"], rows - column["missing_count"]
        if column["detected_type"] == "datetime":
            found.append(_date_parts(frame, column, present, taken, token))
        elif name in splits:
            separator, times = splits[name]
            found.append(_split(frame, name, separator, times, present, taken, token))
    return found
