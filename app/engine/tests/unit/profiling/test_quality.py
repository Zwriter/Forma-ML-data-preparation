import pytest

from forma_engine.profiling.quality import breakdown, completeness, quality_level


def test_completeness_counts_only_valid_cells_and_is_none_without_rows():
    assert completeness(100, missing=3, invalid=2) == 0.95
    assert completeness(0, missing=0, invalid=0) is None


@pytest.mark.parametrize(
    ("missing", "invalid", "level"),
    [
        (0, 0, "good"),
        (1, 0, "good"),  # exactly 99% complete
        (2, 0, "needs_attention"),
        (0, 1, "needs_attention"),  # any invalid value
        (10, 0, "needs_attention"),  # exactly 90% complete
        (11, 0, "poor"),
        (0, 2, "poor"),  # 2% invalid is poor even though 98% complete
    ],
)
def test_quality_levels_follow_the_ordered_rule(missing, invalid, level):
    assert quality_level(100, missing, invalid) == level


def test_one_percent_invalid_is_not_poor_but_more_is():
    assert quality_level(1000, missing=0, invalid=10) == "needs_attention"
    assert quality_level(1000, missing=0, invalid=11) == "poor"


def test_empty_dataset_is_good():
    assert quality_level(0, 0, 0) == "good"


def test_breakdown_adds_up_and_handles_no_cells():
    result = breakdown(rows=10, columns=[(2, 1), (0, 0)])
    assert result == {
        "total_cells": 20,
        "valid_cells": 17,
        "missing_cells": 2,
        "invalid_cells": 1,
        "completeness": 0.85,
    }
    assert breakdown(rows=0, columns=[(0, 0)])["completeness"] is None
