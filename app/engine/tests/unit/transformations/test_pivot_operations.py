import polars as pl
import pytest

from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.executor import execute


def pivot(frame, **overrides):
    parameters = {
        "row_columns": ["team"], "category_column": "period",
        "value_column": "sales", "function": "sum",
    }
    parameters.update(overrides)
    return execute(frame.lazy(), [{"type": "pivot", "parameters": parameters}]).collect()


def test_pivot_aggregates_duplicate_intersections_and_sorts_generated_columns():
    frame = pl.DataFrame({
        "team": ["B", "A", "A", "A"],
        "period": ["Q2", "Q1", "Q2", "Q1"],
        "sales": [3, 4, 5, 6],
    })
    result = pivot(frame)
    assert result.columns == ["team", "period_Q1", "period_Q2"]
    assert result.to_dicts() == [
        {"team": "B", "period_Q1": 0, "period_Q2": 3},
        {"team": "A", "period_Q1": 10, "period_Q2": 5},
    ]


@pytest.mark.parametrize("function,expected", [
    ("count", 2), ("sum", 5), ("average", 2.5), ("minimum", 2), ("maximum", 3),
])
def test_pivot_supports_documented_aggregations(function, expected):
    frame = pl.DataFrame({"team": ["A", "A"], "period": ["Q1", "Q1"], "sales": [2, 3]})
    assert pivot(frame, function=function)["period_Q1"][0] == expected


def test_pivot_empty_input_keeps_row_label_schema():
    frame = pl.DataFrame({
        "team": pl.Series([], dtype=pl.String),
        "period": pl.Series([], dtype=pl.String),
        "sales": pl.Series([], dtype=pl.Int64),
    })
    result = pivot(frame)
    assert result.columns == ["team"]
    assert result.height == 0


@pytest.mark.parametrize("overrides", [
    {"row_columns": ["missing"]},
    {"row_columns": ["period"]},
    {"category_column": "sales"},
    {"value_column": "period"},
    {"function": "median"},
])
def test_pivot_rejects_invalid_roles_and_aggregations(overrides):
    frame = pl.DataFrame({"team": ["A"], "period": ["Q1"], "sales": [2]}).lazy()
    with pytest.raises(InvalidTransformationError):
        pivot(frame, **overrides)


def test_pivot_rejects_non_numeric_values_for_numeric_aggregates():
    frame = pl.DataFrame({"team": ["A"], "period": ["Q1"], "sales": ["two"]}).lazy()
    with pytest.raises(InvalidTransformationError):
        pivot(frame)
