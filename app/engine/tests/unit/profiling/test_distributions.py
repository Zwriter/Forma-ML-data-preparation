from collections import Counter
from datetime import date

import polars as pl

from forma_engine.profiling.distributions import categories, histogram


def bins_of(frame, name, kind):
    return histogram(frame.lazy(), name, kind, frame.schema[name])


def test_continuous_values_use_30_equal_bins_that_sum_to_valid_values(mixed_frame):
    bins = bins_of(mixed_frame, "price", "decimal")
    values = [v for v in mixed_frame["price"].to_list() if v is not None]

    assert len(bins) == 30
    assert sum(b.count for b in bins) == len(values)
    assert bins[0].start == min(values) and bins[-1].end == max(values)
    assert all(a.end == b.start for a, b in zip(bins, bins[1:]))
    assert bins[-1].count >= 1  # the maximum lands in the last, inclusive bin


def test_invalid_text_values_are_left_out(mixed_frame):
    bins = bins_of(mixed_frame, "amount", "decimal")
    valid = [
        v for v in mixed_frame["amount"].to_list() if v not in (None, "n/a", "12,5")
    ]
    assert sum(b.count for b in bins) == len(valid)


def test_few_distinct_integers_get_one_bin_per_value():
    frame = pl.DataFrame({"n": [3, 1, 1, None, 3, 3]})
    bins = bins_of(frame, "n", "integer")
    assert [(b.start, b.end, b.count) for b in bins] == [(1, 1, 2), (3, 3, 3)]


def test_many_distinct_integers_are_binned():
    frame = pl.DataFrame({"n": list(range(100))})
    bins = bins_of(frame, "n", "integer")
    assert len(bins) == 30 and sum(b.count for b in bins) == 100


def test_dates_are_binned_with_iso_edges():
    frame = pl.DataFrame({"d": [date(2024, 1, 1), date(2024, 1, 31), None]})
    bins = bins_of(frame, "d", "datetime")
    assert bins[0].start == "2024-01-01T00:00:00"
    assert bins[-1].end == "2024-01-31T00:00:00"
    assert sum(b.count for b in bins) == 2


def test_constant_and_empty_columns():
    constant = pl.DataFrame({"x": [2.5, 2.5, 2.5]})
    assert [(b.start, b.end, b.count) for b in bins_of(constant, "x", "decimal")] == [
        (2.5, 2.5, 3)
    ]
    empty = pl.DataFrame({"x": [None, None]}, schema={"x": pl.Float64})
    assert bins_of(empty, "x", "decimal") is None


def test_categories_keep_the_top_ten_and_count_the_rest():
    values = [f"v{i}" for i in range(12) for _ in range(12 - i)] + [None]
    frame = pl.DataFrame({"c": values})
    summary = categories(frame.lazy(), "c", "text", pl.String)
    counts = Counter(v for v in values if v is not None)

    assert [item["value"] for item in summary.top] == [f"v{i}" for i in range(10)]
    assert summary.top[0] == {"value": "v0", "count": counts["v0"]}
    assert summary.other_count == counts["v10"] + counts["v11"]
    assert summary.distinct_count == 12


def test_category_ties_sort_by_value_and_booleans_read_as_text(mixed_frame):
    ties = pl.DataFrame({"c": ["b", "a", "b", "a", "c"]})
    top = categories(ties.lazy(), "c", "text", pl.String).top
    assert [item["value"] for item in top] == ["a", "b", "c"]

    active = categories(mixed_frame.lazy(), "active", "boolean", pl.Boolean)
    assert {item["value"] for item in active.top} == {"true", "false"}
    empty = pl.DataFrame({"c": [None]}, schema={"c": pl.String})
    assert categories(empty.lazy(), "c", "text", pl.String) is None
