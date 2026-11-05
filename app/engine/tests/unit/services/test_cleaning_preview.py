import polars as pl
import pytest
from forma_engine.domain.errors import InvalidTransformationError, RequestError
from forma_engine.services.cleaning_preview import CleaningPreviewer

FRAME = pl.DataFrame(
    {
        "id": ["a", "b", "b", "c"],
        "charges": [1.0, None, None, 5.0],
        "flag": ["0", "1", "1", "0"],
    }
).lazy()

FILL_AND_DEDUPE = [
    {
        "type": "fill_null",
        "parameters": {"column": "charges", "strategy": "constant", "value": 0.0},
    },
    {"type": "drop_duplicates", "parameters": {}},
]


def step(kind: str, **parameters) -> dict:
    return {"type": kind, "parameters": parameters}


def preview(operations, frame=FRAME, **page):
    return CleaningPreviewer().preview(frame, operations, **page)


def ids(result):
    return [(row["values"]["id"], row["removed"]) for row in result["rows"]]


def test_page_lists_affected_rows_first_and_marks_changed_cells():
    result = preview(FILL_AND_DEDUPE)
    # Changed and removed rows come first, so the draft's effect is visible at once.
    assert result["rows"] == [
        {"values": {"id": "b", "charges": 0.0, "flag": "1"}, "removed": False},
        {"values": {"id": "b", "charges": None, "flag": "1"}, "removed": True},
        {"values": {"id": "a", "charges": 1.0, "flag": "0"}, "removed": False},
        {"values": {"id": "c", "charges": 5.0, "flag": "0"}, "removed": False},
    ]
    # Each changed cell carries its source value so the worksheet can show old -> new.
    assert result["changed_cells"] == [{"row": 0, "column": "charges", "before": None}]
    assert [(c["name"], c["origin"]) for c in result["columns"]] == [
        ("id", "id"),
        ("charges", "charges"),
        ("flag", "flag"),
    ]
    assert (result["offset"], result["limit"], result["total_count"]) == (0, 100, 4)
    assert result["summary"] == {
        "rows_before": 4,
        "rows_after": 3,
        "rows_removed": 1,
        "values_changed": 1,
        "columns_added": [],
        "columns_removed": [],
        "columns_renamed": [],
    }


def test_pages_over_source_rows_while_summary_covers_the_full_dataset():
    result = preview(FILL_AND_DEDUPE, offset=1, limit=2)
    assert ids(result) == [("b", True), ("a", False)]
    assert result["changed_cells"] == []
    assert result["total_count"] == 4
    assert result["summary"]["rows_removed"] == 1


def test_search_filters_source_rows_like_the_worksheet():
    result = preview(FILL_AND_DEDUPE, search="B")
    assert ids(result) == [("b", False), ("b", True)]
    assert result["total_count"] == 2
    assert result["summary"]["rows_before"] == 4


def test_visible_columns_follow_lineage_and_keep_added_columns():
    result = preview(
        [
            step("rename_columns", mapping={"charges": "total"}),
            step(
                "merge_columns",
                columns=["id", "flag"],
                separator="-",
                into="key",
                drop_sources=False,
            ),
        ],
        columns=["charges", "id"],
    )
    assert [(c["name"], c["origin"]) for c in result["columns"]] == [
        ("total", "charges"),
        ("id", "id"),
        ("key", None),
    ]
    assert result["rows"][0]["values"] == {"total": 1.0, "id": "a", "key": "a-0"}


def test_removed_rows_show_source_values_under_result_names():
    result = preview(
        [
            step("rename_columns", mapping={"charges": "total"}),
            step("drop_null_rows", columns=["total"]),
        ],
        limit=2,
    )
    assert result["rows"][1] == {
        "values": {"id": "b", "total": None, "flag": "1"},
        "removed": True,
    }


def test_unknown_visible_column_is_rejected():
    with pytest.raises(RequestError):
        preview(FILL_AND_DEDUPE, columns=["nope"])


def test_without_enabled_steps_the_source_page_is_unchanged():
    result = preview([{**step("drop_duplicates"), "enabled": False}])
    assert ids(result) == [("a", False), ("b", False), ("b", False), ("c", False)]
    assert result["changed_cells"] == []
    assert result["summary"]["rows_removed"] == 0
    assert result["summary"]["values_changed"] == 0


def test_statistics_use_the_full_dataset_not_only_the_page():
    result = preview(
        [step("fill_null", column="charges", strategy="mean")], offset=1, limit=1
    )
    assert result["rows"][0]["values"]["charges"] == 3.0
    assert result["summary"]["values_changed"] == 2


def test_type_conversion_with_equal_text_is_not_a_change():
    result = preview([step("convert_type", column="flag", to="integer")])
    assert result["rows"][0]["values"]["flag"] == 0
    assert result["changed_cells"] == []
    assert result["summary"]["values_changed"] == 0
    flag = next(c for c in result["columns"] if c["name"] == "flag")
    assert flag["type"] == "Int64"


def test_column_changes_are_reported_and_renamed_values_compared():
    result = preview(
        [
            step("rename_columns", mapping={"charges": "total"}),
            step("fill_null", column="total", strategy="constant", value=9.0),
            step(
                "merge_columns",
                columns=["id", "flag"],
                separator="-",
                into="key",
                drop_sources=False,
            ),
            step("drop_columns", columns=["flag"]),
        ]
    )
    summary = result["summary"]
    assert summary["columns_added"] == ["key"]
    assert summary["columns_removed"] == ["flag"]
    assert summary["columns_renamed"] == [{"from": "charges", "to": "total"}]
    assert summary["values_changed"] == 2
    assert {"row": 1, "column": "total", "before": None} in result["changed_cells"]
    assert [c["name"] for c in result["columns"]] == ["id", "total", "key"]


def test_invalid_step_error_names_its_position():
    with pytest.raises(InvalidTransformationError, match=r"^Step 2: ") as error:
        preview(
            [
                step("drop_duplicates"),
                step("fill_null", column="nope", strategy="mean"),
            ]
        )
    assert error.value.details == {"step": 1}


def test_execution_failure_error_names_its_position():
    frame = pl.DataFrame({"x": ["1", "bad"]}).lazy()
    with pytest.raises(InvalidTransformationError, match=r"^Step 1: 1 value in 'x'"):
        preview([step("convert_type", column="x", to="integer")], frame=frame)


def test_page_rows_are_bounded_by_limit():
    frame = pl.DataFrame({"x": list(range(10))}).lazy()
    result = preview([step("drop_duplicates")], frame=frame, limit=3)
    assert len(result["rows"]) == 3
    assert result["summary"]["rows_before"] == 10


def test_changed_cells_carry_the_replaced_value():
    result = preview(
        [
            step(
                "replace_values",
                columns=["flag"],
                find="1",
                replace="yes",
                match="whole",
                case_sensitive=False,
            )
        ]
    )
    assert result["changed_cells"] == [
        {"row": 0, "column": "flag", "before": "1"},
        {"row": 1, "column": "flag", "before": "1"},
    ]


def test_affected_rows_come_first_in_view_order_then_the_rest():
    view = [{"column": "id", "direction": "descending", "nulls": "last"}]
    frame = pl.DataFrame(
        {"id": ["a", "b", "c", "d"], "charges": [None, 2.0, None, 4.0]}
    ).lazy()
    fill = [step("fill_null", column="charges", strategy="constant", value=0.0)]

    result = CleaningPreviewer().preview(frame, fill, view=view)

    assert [row["values"]["id"] for row in result["rows"]] == ["c", "a", "d", "b"]
    assert [cell["row"] for cell in result["changed_cells"]] == [0, 1]
