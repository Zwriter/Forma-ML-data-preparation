"""The sort view: a display order kept beside the data, never written to it."""

from typing import Any

import polars as pl

from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.lineage import Lineage

SortKey = dict[str, str]

DIRECTIONS = {"ascending", "descending"}
NULL_PLACEMENTS = {"first", "last"}


def validate_view(keys: Any, columns: list[str]) -> tuple[list[SortKey], list[str]]:
    """Return the keys whose column exists and the names of those that do not.

    Malformed keys raise; a missing column is dropped so a remembered view
    survives a file whose columns changed.
    """
    if not isinstance(keys, list):
        raise InvalidTransformationError("Sort keys must be a list.")
    seen: set[str] = set()
    kept: list[SortKey] = []
    dropped: list[str] = []
    for key in keys:
        column = _check_key(key)
        if column in seen:
            raise InvalidTransformationError("Each sort column can appear only once.")
        seen.add(column)
        if column in columns:
            kept.append(
                {"column": column, "direction": key["direction"], "nulls": key["nulls"]}
            )
        else:
            dropped.append(column)
    return kept, dropped


def _check_key(key: Any) -> str:
    if not isinstance(key, dict) or not isinstance(key.get("column"), str):
        raise InvalidTransformationError("Choose an existing column for each sort key.")
    if key.get("direction") not in DIRECTIONS:
        raise InvalidTransformationError("Choose ascending or descending order.")
    if key.get("nulls") not in NULL_PLACEMENTS:
        raise InvalidTransformationError("Choose where missing values appear.")
    return key["column"]


def apply_view(frame: pl.LazyFrame, keys: list[SortKey]) -> pl.LazyFrame:
    """Sort frame by keys; ties keep stored order. No keys means stored order."""
    if not keys:
        return frame
    return frame.sort(
        by=[key["column"] for key in keys],
        descending=[key["direction"] == "descending" for key in keys],
        nulls_last=[key["nulls"] == "last" for key in keys],
        maintain_order=True,
    )


def carry_view(keys: list[SortKey], lineage: Lineage) -> list[SortKey]:
    """Map keys onto the columns lineage says they became; drop removed ones."""
    current = {origin: name for name, origin in lineage.items() if origin is not None}
    return [
        key | {"column": current[key["column"]]}
        for key in keys
        if key["column"] in current
    ]
