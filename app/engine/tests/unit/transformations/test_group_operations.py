import polars as pl
import pytest

from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.executor import execute


def grouped(frame, parameters):
    return execute(frame.lazy(), [{"type": "group_by", "parameters": parameters}]).collect()


def test_group_by_preserves_first_seen_keys_and_applies_multiple_aggregates():
    frame = pl.DataFrame({"team": ["B", "A", "B", "A"], "score": [2, 4, 6, 8]})
    result = grouped(frame, {
        "group_columns": ["team"],
        "aggregations": [
            {"column": "score", "function": "sum", "output_name": "total"},
            {"column": "score", "function": "average", "output_name": "mean"},
            {"column": None, "function": "count", "output_name": "rows"},
        ],
    })
    assert result.to_dicts() == [
        {"team": "B", "total": 8, "mean": 4.0, "rows": 2},
        {"team": "A", "total": 12, "mean": 6.0, "rows": 2},
    ]


def test_group_by_empty_input_keeps_deterministic_schema():
    result = grouped(pl.DataFrame({"team": [], "score": []}, schema={
        "team": pl.String, "score": pl.Int64,
    }), {
        "group_columns": ["team"],
        "aggregations": [{"column": "score", "function": "sum", "output_name": "total"}],
    })
    assert result.columns == ["team", "total"]
    assert result.height == 0


@pytest.mark.parametrize("aggregation", [
    {"column": "score", "function": "sum", "output_name": "team"},
    {"column": "label", "function": "sum", "output_name": "total"},
    {"column": "label", "function": "average", "output_name": "mean"},
    {"column": None, "function": "median", "output_name": "middle"},
])
def test_group_by_rejects_duplicate_names_incompatible_or_unsupported_aggregates(aggregation):
    frame = pl.DataFrame({"team": ["A"], "score": [1], "label": ["one"]}).lazy()
    with pytest.raises(InvalidTransformationError):
        execute(frame, [{"type": "group_by", "parameters": {
            "group_columns": ["team"], "aggregations": [aggregation],
        }}]).collect()


@pytest.mark.parametrize("parameters", [
    {"group_columns": [], "aggregations": [{"column": None, "function": "count", "output_name": "n"}]},
    {"group_columns": ["missing"], "aggregations": [{"column": None, "function": "count", "output_name": "n"}]},
    {"group_columns": ["team", "team"], "aggregations": [{"column": None, "function": "count", "output_name": "n"}]},
    {"group_columns": ["team"], "aggregations": []},
    {"group_columns": ["team"], "aggregations": [
        {"column": None, "function": "count", "output_name": "n"},
        {"column": None, "function": "count", "output_name": "n"},
    ]},
])
def test_group_by_rejects_invalid_keys_and_aggregate_names(parameters):
    with pytest.raises(InvalidTransformationError):
        execute(pl.DataFrame({"team": ["A"]}).lazy(), [
            {"type": "group_by", "parameters": parameters},
        ]).collect()
