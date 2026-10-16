import polars as pl
import pytest

from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.executor import execute


def test_filter_supports_typed_values_all_any_text_null_and_dates():
    frame = pl.DataFrame({
        "name": ["Aster", "birch", "Cedar", None],
        "amount": [4, 12, 20, 30],
        "day": ["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01"],
    }).with_columns(pl.col("day").str.to_date()).lazy()
    operation = {"type": "filter_rows", "parameters": {
        "mode": "all", "rules": [
            {"column": "amount", "operator": "at_least", "value": "10"},
            {
                "column": "name",
                "operator": "contains",
                "value": "IR",
                "case_sensitive": False,
            },
        ],
    }}
    assert execute(frame, [operation]).collect()["name"].to_list() == ["birch"]

    missing = {"type": "filter_rows", "parameters": {
        "mode": "any", "rules": [
            {"column": "name", "operator": "is_empty"},
            {"column": "day", "operator": "greater_than", "value": "2026-02-01"},
        ],
    }}
    assert execute(frame, [missing]).collect().height == 2


@pytest.mark.parametrize(
    "operator", ["equals", "not_equals", "contains", "begins_with", "ends_with"]
)
def test_text_match_respects_case_sensitivity(operator):
    frame = pl.DataFrame({"name": ["Alpha", "alpha"]}).lazy()
    operation = {"type": "filter_rows", "parameters": {"mode": "all", "rules": [
        {
            "column": "name",
            "operator": operator,
            "value": "Alpha",
            "case_sensitive": True,
        },
    ]}}
    assert execute(frame, [operation]).collect().height == 1


@pytest.mark.parametrize(
    "operator,expected",
    [("equals", 1), ("not_equals", 2), ("greater_than", 1), ("less_than", 1),
     ("at_least", 2), ("at_most", 2)],
)
def test_numeric_comparison_operators(operator, expected):
    frame = pl.DataFrame({"amount": [1, 2, 3]}).lazy()
    operation = {"type": "filter_rows", "parameters": {"mode": "all", "rules": [
        {"column": "amount", "operator": operator, "value": "2"},
    ]}}
    assert execute(frame, [operation]).collect().height == expected


def test_filter_empty_checks_match_null_and_empty_text():
    frame = pl.DataFrame({"name": [None, "", "oak"]}).lazy()
    empty = {"type": "filter_rows", "parameters": {"mode": "all", "rules": [
        {"column": "name", "operator": "is_empty"},
    ]}}
    not_empty = {"type": "filter_rows", "parameters": {"mode": "all", "rules": [
        {"column": "name", "operator": "is_not_empty"},
    ]}}
    assert execute(frame, [empty]).collect().height == 2
    assert execute(frame, [not_empty]).collect().height == 1


def test_filter_rejects_unknown_columns_invalid_types_and_empty_rules():
    frame = pl.DataFrame({"amount": [1, 2], "name": ["x", "y"]}).lazy()
    invalid = [
        {"type": "filter_rows", "parameters": {"mode": "all", "rules": []}},
        {"type": "filter_rows", "parameters": {"mode": "all", "rules": [
            {"column": "missing", "operator": "equals", "value": "x"},
        ]}},
        {"type": "filter_rows", "parameters": {"mode": "all", "rules": [
            {"column": "amount", "operator": "contains", "value": "1"},
        ]}},
        {"type": "filter_rows", "parameters": {"mode": "all", "rules": [
            {"column": "amount", "operator": "equals", "value": "not-a-number"},
        ]}},
    ]
    for operation in invalid:
        with pytest.raises(InvalidTransformationError):
            execute(frame, [operation]).collect()


def test_filter_rejects_executable_expression_payload():
    operation = {"type": "filter_rows", "parameters": {
        "expression": "__import__('os').system('echo unsafe')",
    }}
    with pytest.raises(InvalidTransformationError):
        execute(pl.DataFrame({"name": ["x"]}).lazy(), [operation])
