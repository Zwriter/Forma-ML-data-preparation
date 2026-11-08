import polars as pl
import pytest

from forma_engine.domain.errors import CancelledError
from forma_engine.profiling.cancellable import collect


def test_collects_like_polars_without_a_token():
    query = pl.LazyFrame({"x": [3, 1, 2]}).sort("x")
    assert collect(query).equals(query.collect())


def test_collects_with_a_token_that_is_not_cancelled():
    query = pl.LazyFrame({"x": [3, 1, 2]}).select(pl.col("x").sum())
    assert collect(query, lambda: False).item() == 6


def test_a_cancelled_token_stops_before_the_query_runs():
    def explode(_):
        raise AssertionError("the query ran")

    query = pl.LazyFrame({"x": [1]}).select(pl.col("x").map_batches(explode))
    with pytest.raises(CancelledError):
        collect(query, lambda: True)
