"""Completeness and quality levels (spec FR-008, FR-011): the only implementation."""

POOR_COMPLETENESS = 0.90
GOOD_COMPLETENESS = 0.99
POOR_INVALID_SHARE = 0.01


def completeness(rows: int, missing: int, invalid: int) -> float | None:
    return (rows - missing - invalid) / rows if rows else None


def quality_level(rows: int, missing: int, invalid: int) -> str:
    if not rows:
        return "good"
    share = completeness(rows, missing, invalid)
    if share < POOR_COMPLETENESS or invalid / rows > POOR_INVALID_SHARE:
        return "poor"
    if share < GOOD_COMPLETENESS or invalid:
        return "needs_attention"
    return "good"


def breakdown(rows: int, columns: list[tuple[int, int]]) -> dict:
    """Cell totals from (missing, invalid) per column."""
    total = rows * len(columns)
    missing = sum(column[0] for column in columns)
    invalid = sum(column[1] for column in columns)
    valid = total - missing - invalid
    return {
        "total_cells": total,
        "valid_cells": valid,
        "missing_cells": missing,
        "invalid_cells": invalid,
        "completeness": valid / total if total else None,
    }
