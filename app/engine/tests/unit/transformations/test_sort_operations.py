import polars as pl
import pytest

from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.executor import execute


def sort(keys):
    return {"type": "sort_rows", "parameters": {"keys": keys}}


def test_sort_is_a_view_and_leaves_stored_order_unchanged():
    frame = pl.DataFrame({"x": [3, 1, 2]}).lazy()
    keys = [{"column": "x", "direction": "ascending", "nulls": "last"}]

    assert execute(frame, [sort(keys)]).collect()["x"].to_list() == [3, 1, 2]


def test_sort_accepts_no_keys_to_clear_the_view():
    frame = pl.DataFrame({"x": [1]}).lazy()

    assert execute(frame, [sort([])]).collect()["x"].to_list() == [1]


@pytest.mark.parametrize(
    "keys",
    [
        None,
        [{"column": "missing", "direction": "ascending", "nulls": "last"}],
        [{"column": "x", "direction": "sideways", "nulls": "last"}],
        [{"column": "x", "direction": "ascending", "nulls": "middle"}],
        [
            {"column": "x", "direction": "ascending", "nulls": "last"},
            {"column": "x", "direction": "descending", "nulls": "first"},
        ],
    ],
)
def test_sort_rejects_invalid_keys(keys):
    with pytest.raises(InvalidTransformationError):
        execute(pl.DataFrame({"x": [1]}).lazy(), [sort(keys)])
