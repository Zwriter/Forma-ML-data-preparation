import polars as pl
import pytest

from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.executor import execute


def test_sort_orders_multiple_keys_with_null_placement_and_stable_ties():
    frame = pl.DataFrame(
        {
            "group": ["b", "a", "a", "a", None],
            "value": [1, 2, 1, 1, 0],
            "row": [0, 1, 2, 3, 4],
        }
    ).lazy()
    operation = {"type": "sort_rows", "parameters": {"keys": [
        {"column": "group", "direction": "ascending", "nulls": "last"},
        {"column": "value", "direction": "descending", "nulls": "first"},
    ]}}
    result = execute(frame, [operation]).collect()
    assert result["row"].to_list() == [1, 2, 3, 0, 4]
    assert result.height == 5


@pytest.mark.parametrize(
    "keys",
    [
        [],
        [{"column": "missing", "direction": "ascending", "nulls": "last"}],
        [{"column": "x", "direction": "sideways", "nulls": "last"}],
        [{"column": "x", "direction": "ascending", "nulls": "middle"}],
    ],
)
def test_sort_rejects_invalid_keys(keys):
    operation = {"type": "sort_rows", "parameters": {"keys": keys}}
    with pytest.raises(InvalidTransformationError):
        execute(pl.DataFrame({"x": [1]}).lazy(), [operation])


def test_sort_rejects_duplicate_keys():
    operation = {"type": "sort_rows", "parameters": {"keys": [
        {"column": "x", "direction": "ascending", "nulls": "last"},
        {"column": "x", "direction": "descending", "nulls": "first"},
    ]}}
    with pytest.raises(InvalidTransformationError):
        execute(pl.DataFrame({"x": [1]}).lazy(), [operation])
