import polars as pl
import pytest
from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.executor import execute


def run(frame: pl.DataFrame, kind: str, **parameters) -> pl.DataFrame:
    return execute(frame.lazy(), [{"type": kind, "parameters": parameters}]).collect()


def test_replace_whole_value_is_case_insensitive_by_default():
    frame = pl.DataFrame({"churn": ["No", "n/a", "N/A", "Yes"]})
    result = run(
        frame,
        "replace_values",
        columns=["churn"],
        find="N/A",
        replace="Unknown",
        match="whole",
        case_sensitive=False,
    )
    assert result["churn"].to_list() == ["No", "Unknown", "Unknown", "Yes"]


def test_replace_whole_value_case_sensitive_and_with_missing():
    frame = pl.DataFrame({"churn": ["n/a", "N/A"]})
    result = run(
        frame,
        "replace_values",
        columns=["churn"],
        find="N/A",
        replace=None,
        match="whole",
        case_sensitive=True,
    )
    assert result["churn"].to_list() == ["n/a", None]


def test_replace_contains_treats_find_as_literal_text():
    frame = pl.DataFrame({"code": ["a.b.c", "abc", "A.B"]})
    result = run(
        frame,
        "replace_values",
        columns=["code"],
        find=".",
        replace="-",
        match="contains",
        case_sensitive=True,
    )
    assert result["code"].to_list() == ["a-b-c", "abc", "A-B"]


def test_replace_contains_case_insensitive_escapes_pattern_characters():
    frame = pl.DataFrame({"note": ["Total (USD)", "total (usd) due"]})
    result = run(
        frame,
        "replace_values",
        columns=["note"],
        find="(usd)",
        replace="$",
        match="contains",
        case_sensitive=False,
    )
    assert result["note"].to_list() == ["Total $", "total $ due"]


def test_replace_whole_value_on_numeric_column_keeps_type():
    frame = pl.DataFrame({"score": [-1, 5, -1]})
    result = run(
        frame,
        "replace_values",
        columns=["score"],
        find="-1",
        replace=None,
        match="whole",
        case_sensitive=True,
    )
    assert result["score"].to_list() == [None, 5, None]
    assert result.schema["score"] == pl.Int64


def test_split_column_keeps_remainder_in_last_part_and_fills_missing():
    frame = pl.DataFrame({"name": ["Ana Pop", "Radu Marin Ilie", "Solo", None]})
    result = run(
        frame,
        "split_column",
        column="name",
        separator=" ",
        into=["first", "last"],
        drop_original=False,
    )
    assert result.columns == ["name", "first", "last"]
    assert result["first"].to_list() == ["Ana", "Radu", "Solo", None]
    assert result["last"].to_list() == ["Pop", "Marin Ilie", None, None]


def test_split_column_can_drop_original_in_place():
    frame = pl.DataFrame({"id": [1], "name": ["Ana Pop"], "age": [3]})
    result = run(
        frame,
        "split_column",
        column="name",
        separator=" ",
        into=["first", "last"],
        drop_original=True,
    )
    assert result.columns == ["id", "first", "last", "age"]


def test_merge_columns_treats_missing_as_empty_and_can_drop_sources():
    frame = pl.DataFrame({"city": ["Cluj", None], "country": ["RO", "RO"], "n": [1, 2]})
    result = run(
        frame,
        "merge_columns",
        columns=["city", "country"],
        separator=", ",
        into="location",
        drop_sources=True,
    )
    assert result.columns == ["location", "n"]
    assert result["location"].to_list() == ["Cluj, RO", ", RO"]


def test_merge_columns_casts_non_text_values():
    frame = pl.DataFrame({"a": [1, 2], "b": ["x", "y"]})
    result = run(
        frame,
        "merge_columns",
        columns=["a", "b"],
        separator="-",
        into="ab",
        drop_sources=False,
    )
    assert result.columns == ["a", "b", "ab"]
    assert result["ab"].to_list() == ["1-x", "2-y"]


@pytest.mark.parametrize(
    ("strategy", "expected"),
    [("previous", [None, 1, 1, 3]), ("next", [1, 1, 3, 3])],
)
def test_fill_previous_and_next_values(strategy, expected):
    frame = pl.DataFrame({"x": [None, 1, None, 3]})
    result = run(frame, "fill_null", column="x", strategy=strategy)
    assert result["x"].to_list() == expected


def test_convert_with_null_policy_turns_unconvertible_values_missing():
    frame = pl.DataFrame({"x": ["1", "two", None]})
    result = run(frame, "convert_type", column="x", to="integer", on_error="null")
    assert result["x"].to_list() == [1, None, None]


def test_convert_with_fail_policy_reports_unconvertible_count():
    frame = pl.DataFrame({"x": ["1", "two", "three", None]})
    with pytest.raises(InvalidTransformationError, match="2 values in 'x'"):
        run(frame, "convert_type", column="x", to="integer", on_error="fail")


def test_convert_without_policy_defaults_to_fail():
    frame = pl.DataFrame({"x": ["1", "bad"]})
    with pytest.raises(InvalidTransformationError, match="1 value in 'x'"):
        run(frame, "convert_type", column="x", to="integer")
