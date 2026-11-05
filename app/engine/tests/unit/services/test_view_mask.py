import polars as pl
import pytest

from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.services.view_mask import apply_view, carry_view, validate_view
from forma_engine.transformations.lineage import initial_lineage, track


def key(column, direction="ascending", nulls="last"):
    return {"column": column, "direction": direction, "nulls": nulls}


def test_validate_view_keeps_known_columns_and_reports_unknown_ones():
    kept, dropped = validate_view([key("city"), key("gone"), key("id")], ["id", "city"])

    assert kept == [key("city"), key("id")]
    assert dropped == ["gone"]


def test_validate_view_accepts_empty_view():
    assert validate_view([], ["id"]) == ([], [])


@pytest.mark.parametrize(
    "keys",
    [
        None,
        "city",
        [None],
        [{"direction": "ascending", "nulls": "last"}],
        [key("city", direction="up")],
        [key("city", nulls="middle")],
        [key("city"), key("city", "descending")],
    ],
)
def test_validate_view_rejects_malformed_keys(keys):
    with pytest.raises(InvalidTransformationError):
        validate_view(keys, ["city"])


def test_apply_view_sorts_by_several_keys():
    frame = pl.LazyFrame({"city": ["b", "a", "b", "a"], "n": [1, 2, 3, 4]})

    result = apply_view(frame, [key("city"), key("n", "descending")]).collect()

    assert result["n"].to_list() == [4, 2, 3, 1]


def test_apply_view_places_nulls_first_or_last():
    frame = pl.LazyFrame({"n": [2, None, 1]})

    first = apply_view(frame, [key("n", nulls="first")]).collect()["n"].to_list()
    last = apply_view(frame, [key("n", nulls="last")]).collect()["n"].to_list()

    assert first == [None, 1, 2]
    assert last == [1, 2, None]


def test_apply_view_keeps_stored_order_for_ties():
    frame = pl.LazyFrame({"city": ["a", "b", "a", "b"], "id": [1, 2, 3, 4]})

    result = apply_view(frame, [key("city", "descending")]).collect()

    assert result["id"].to_list() == [2, 4, 1, 3]


def test_apply_view_with_no_keys_returns_the_frame_unchanged():
    frame = pl.LazyFrame({"n": [3, 1, 2]})

    assert apply_view(frame, []) is frame


def test_carry_view_follows_renames_and_drops_removed_columns():
    lineage = initial_lineage(["city", "id", "n"])
    lineage = track(
        lineage, {"type": "rename_columns", "parameters": {"mapping": {"city": "town"}}}
    )
    lineage = track(lineage, {"type": "drop_columns", "parameters": {"columns": ["n"]}})

    view = [key("city", "descending"), key("n"), key("id")]

    assert carry_view(view, lineage) == [key("town", "descending"), key("id")]


def test_carry_view_ignores_new_columns():
    lineage = track(
        initial_lineage(["name"]),
        {
            "type": "split_column",
            "parameters": {"column": "name", "drop_original": True, "into": ["a"]},
        },
    )

    assert carry_view([key("name")], lineage) == []
