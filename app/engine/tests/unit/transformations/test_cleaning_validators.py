import pytest
from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.validators import validate

COLUMNS = ["name", "city", "country", "score"]


def check(kind: str, **parameters) -> None:
    validate({"type": kind, "parameters": parameters}, COLUMNS)


def replace(**overrides):
    parameters = {
        "columns": ["city"],
        "find": "N/A",
        "replace": "",
        "match": "whole",
        "case_sensitive": False,
    }
    return {**parameters, **overrides}


def test_valid_replace_passes():
    check("replace_values", **replace())
    check("replace_values", **replace(replace=None, match="contains"))


@pytest.mark.parametrize(
    "overrides",
    [
        {"columns": []},
        {"columns": ["missing"]},
        {"find": 3},
        {"replace": 3},
        {"match": "regex"},
        {"case_sensitive": "yes"},
        {"match": "contains", "find": ""},
    ],
)
def test_invalid_replace_settings_are_rejected(overrides):
    with pytest.raises(InvalidTransformationError):
        check("replace_values", **replace(**overrides))


def split(**overrides):
    parameters = {
        "column": "name",
        "separator": " ",
        "into": ["first", "last"],
        "drop_original": True,
    }
    return {**parameters, **overrides}


def test_valid_split_passes_and_may_reuse_dropped_original_name():
    check("split_column", **split())
    check("split_column", **split(into=["name", "last"], drop_original=True))


@pytest.mark.parametrize(
    "overrides",
    [
        {"column": "missing"},
        {"separator": ""},
        {"into": ["only"]},
        {"into": ["a", "a"]},
        {"into": ["a", " "]},
        {"into": ["city", "b"]},
        {"into": ["name", "b"], "drop_original": False},
        {"drop_original": "no"},
    ],
)
def test_invalid_split_settings_are_rejected(overrides):
    with pytest.raises(InvalidTransformationError):
        check("split_column", **split(**overrides))


def merge(**overrides):
    parameters = {
        "columns": ["city", "country"],
        "separator": ", ",
        "into": "location",
        "drop_sources": False,
    }
    return {**parameters, **overrides}


def test_valid_merge_passes():
    check("merge_columns", **merge())
    check("merge_columns", **merge(into="city", drop_sources=True))


@pytest.mark.parametrize(
    "overrides",
    [
        {"columns": ["city"]},
        {"columns": ["city", "city"]},
        {"columns": ["city", "missing"]},
        {"separator": 1},
        {"into": ""},
        {"into": "score"},
        {"drop_sources": 1},
    ],
)
def test_invalid_merge_settings_are_rejected(overrides):
    with pytest.raises(InvalidTransformationError):
        check("merge_columns", **merge(**overrides))


def test_fill_accepts_previous_and_next_without_value():
    check("fill_null", column="score", strategy="previous")
    check("fill_null", column="score", strategy="next")


def test_convert_rejects_unknown_error_policy():
    check("convert_type", column="score", to="integer", on_error="null")
    with pytest.raises(InvalidTransformationError):
        check("convert_type", column="score", to="integer", on_error="skip")
