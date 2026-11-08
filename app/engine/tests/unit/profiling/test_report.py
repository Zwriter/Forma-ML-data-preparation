import pytest

from forma_engine.profiling.report import (
    CategorySummary,
    ColumnProfile,
    HistogramBin,
    NumericSummary,
    Profile,
)


def column(**overrides) -> ColumnProfile:
    values = dict(
        position=1,
        name="amount",
        stored_type="String",
        detected_type="decimal",
        missing_count=1,
        invalid_count=2,
        unique_count=5,
        completeness=0.7,
        quality="poor",
        examples=["1", "2.5"],
    )
    return ColumnProfile(**(values | overrides))


def profile(columns, **overrides) -> Profile:
    values = dict(
        dataset_id="d1",
        history_id="h1",
        data_version="v1",
        computed_at="2026-11-05T10:24:00Z",
        row_count=10,
        column_count=len(columns),
        missing_cells=1,
        duplicate_rows=0,
        quality={"total_cells": 10, "completeness": 0.7},
        columns=columns,
    )
    return Profile(**(values | overrides))


def test_to_dict_matches_the_ipc_shape():
    numeric = NumericSummary(1.5, 1.0, 0.5, 1, 2, [HistogramBin(1, 2, 3)])
    result = profile([column(numeric=numeric)]).to_dict()

    assert result["columns"][0]["numeric"] == {
        "mean": 1.5,
        "median": 1.0,
        "std": 0.5,
        "min": 1,
        "max": 2,
        "histogram": [{"start": 1, "end": 2, "count": 3}],
    }
    assert result["columns"][0]["categories"] is None
    assert result["quality"] == {"total_cells": 10, "completeness": 0.7}
    assert set(result) == {
        "dataset_id",
        "history_id",
        "data_version",
        "computed_at",
        "row_count",
        "column_count",
        "missing_cells",
        "duplicate_rows",
        "quality",
        "columns",
    }


@pytest.mark.parametrize(
    "build",
    [
        lambda: column(missing_count=-1),
        lambda: column(examples=["a", "b", "c", "d"]),
        lambda: NumericSummary(0, 0, 0, 0, 0, []),
        lambda: NumericSummary(0, 0, 0, 0, 0, [HistogramBin(0, 1, 1)] * 51),
        lambda: CategorySummary([{"value": "a", "count": 1}] * 11, 0, 11),
        lambda: profile([column()], column_count=2),
        lambda: profile([column()], row_count=-1),
    ],
)
def test_invariants_are_enforced(build):
    with pytest.raises(ValueError):
        build()
