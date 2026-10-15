import pytest

from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.filter_parser import parse_filter
from forma_engine.transformations.validators import validate


@pytest.mark.parametrize(
    "operation",
    [
        {"type": "drop_duplicates", "parameters": {}},
        {"type": "drop_null_rows", "parameters": {}},
        {
            "type": "fill_null",
            "parameters": {"column": "x", "strategy": "constant", "value": 0},
        },
        {"type": "rename_columns", "parameters": {"mapping": {"x": "renamed"}}},
        {"type": "drop_columns", "parameters": {"columns": ["y"]}},
        {"type": "convert_type", "parameters": {"column": "x", "to": "float"}},
        {
            "type": "filter_rows",
            "parameters": {"expression": "x >= 2 AND y IS NOT NULL"},
        },
    ],
)
def test_accepts_all_seven_declared_operations(operation):
    validate(operation, ["x", "y"])


@pytest.mark.parametrize("strategy", ["mean", "median", "mode"])
def test_accepts_non_constant_fill_strategies(strategy):
    validate(
        {"type": "fill_null", "parameters": {"column": "x", "strategy": strategy}},
        ["x"],
    )


@pytest.mark.parametrize(
    "operation,columns",
    [
        ({"type": "unknown", "parameters": {}}, ["x"]),
        ({"type": "drop_duplicates", "parameters": []}, ["x"]),
        (
            {
                "type": "fill_null",
                "parameters": {"column": "missing", "strategy": "mode"},
            },
            ["x"],
        ),
        (
            {
                "type": "fill_null",
                "parameters": {"column": "x", "strategy": "constant"},
            },
            ["x"],
        ),
        (
            {
                "type": "fill_null",
                "parameters": {"column": "x", "strategy": "average", "value": 0},
            },
            ["x"],
        ),
        (
            {"type": "rename_columns", "parameters": {"mapping": {"missing": "y"}}},
            ["x"],
        ),
        ({"type": "rename_columns", "parameters": {"mapping": {"x": "y"}}}, ["x", "y"]),
        ({"type": "drop_columns", "parameters": {"columns": ["x"]}}, ["x"]),
        ({"type": "drop_columns", "parameters": {"columns": ["missing"]}}, ["x", "y"]),
        (
            {"type": "convert_type", "parameters": {"column": "x", "to": "python"}},
            ["x"],
        ),
        ({"type": "filter_rows", "parameters": {"expression": "missing > 2"}}, ["x"]),
    ],
)
def test_rejects_invalid_operation_parameters(operation, columns):
    with pytest.raises(InvalidTransformationError):
        validate(operation, columns)


@pytest.mark.parametrize("order", [-1, True, 1.5, "first"])
def test_rejects_invalid_operation_order(order):
    with pytest.raises(InvalidTransformationError, match="order"):
        validate({"type": "drop_duplicates", "parameters": {}, "order": order}, ["x"])


def test_accepts_explicit_order_and_enabled_state():
    validate(
        {"type": "drop_duplicates", "parameters": {}, "order": 2, "enabled": False},
        ["x"],
    )


def test_rejects_non_boolean_enabled_state():
    with pytest.raises(InvalidTransformationError, match="enabled"):
        validate({"type": "drop_duplicates", "parameters": {}, "enabled": "yes"}, ["x"])


@pytest.mark.parametrize(
    "expression",
    [
        "x >",
        "x + 2 > 3",
        "x == 1; __import__('os').system('whoami')",
        "__import__('os').system('whoami')",
        "__column__('x') == 1",
        "open('/tmp/marker', 'w')",
        "x.__class__ == 1",
        "x <> 1",
        "missing == 1",
        "x == None",
    ],
)
def test_rejects_malformed_executable_or_unsupported_filter(expression):
    with pytest.raises(InvalidTransformationError):
        validate(
            {"type": "filter_rows", "parameters": {"expression": expression}}, ["x"]
        )


def test_filter_accepts_comparisons_boolean_groups_and_null_checks():
    expression = "(x >= 2 AND x <= 5) OR y IS NULL"

    assert parse_filter(expression, ["x", "y"]) is not None


def test_filter_supports_quoted_column_names_and_preserves_literal_text():
    expression = '`full name` == "Alice AND Bob" AND x IS NOT NULL'

    assert parse_filter(expression, ["full name", "x"]) is not None


def test_rejects_filter_with_unclosed_quoted_column():
    with pytest.raises(InvalidTransformationError, match="backtick"):
        parse_filter("`full name == 1", ["full name"])
