import polars as pl
import pytest
from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.executor import execute


def test_executor_applies_ordered_operations_and_skips_disabled():
    frame = pl.DataFrame({"x": [1, 1, None]}).lazy()
    result = execute(
        frame,
        [
            {"type": "drop_duplicates", "parameters": {}, "order": 1},
            {
                "type": "fill_null",
                "parameters": {"column": "x", "strategy": "constant", "value": 5},
                "order": 2,
            },
            {"type": "drop_null_rows", "parameters": {}, "enabled": False, "order": 3},
        ],
    ).collect()
    assert result.height == 2
    assert result["x"].to_list() == [1, 5]


def test_invalid_later_operation_does_not_mutate_source_or_commit_result():
    source = pl.DataFrame({"x": [1, None]}).lazy()
    with pytest.raises(InvalidTransformationError):
        execute(
            source,
            [
                {"type": "drop_null_rows", "parameters": {}},
                {
                    "type": "convert_type",
                    "parameters": {"column": "x", "to": "invalid"},
                },
            ],
        )
    assert source.collect().height == 2


def test_executor_checks_cancellation_between_operations():
    with pytest.raises(Exception) as error:
        execute(
            pl.DataFrame({"x": [1]}).lazy(),
            [{"type": "drop_duplicates", "parameters": {}}],
            lambda: True,
        )
    assert getattr(error.value, "code", None) == "CANCELLED"


def test_executor_rejects_duplicate_explicit_order_values():
    operations = [
        {"type": "drop_duplicates", "parameters": {}, "order": 1},
        {"type": "drop_null_rows", "parameters": {}, "order": 1},
    ]
    with pytest.raises(InvalidTransformationError):
        execute(pl.DataFrame({"x": [1]}).lazy(), operations)


def test_executor_rejects_mean_fill_for_text_column():
    operation = {"type": "fill_null", "parameters": {"column": "x", "strategy": "mean"}}
    with pytest.raises(InvalidTransformationError):
        execute(pl.DataFrame({"x": ["a", None]}).lazy(), [operation])


def test_executor_rejects_mode_for_all_missing_column():
    operation = {"type": "fill_null", "parameters": {"column": "x", "strategy": "mode"}}
    with pytest.raises(InvalidTransformationError):
        execute(pl.DataFrame({"x": [None]}).lazy(), [operation])
