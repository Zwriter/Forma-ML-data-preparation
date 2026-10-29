import polars as pl
import pytest
from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.services.cleaning_preview import CleaningPreviewer

FRAME = pl.DataFrame(
    {
        "id": ["a", "b", "b", "c"],
        "charges": [1.0, None, None, 5.0],
        "flag": ["0", "1", "1", "0"],
    }
).lazy()


def step(kind: str, **parameters) -> dict:
    return {"type": kind, "parameters": parameters}


def test_preview_marks_filled_cells_and_removed_duplicate_rows():
    result = CleaningPreviewer(limit=100).preview(
        FRAME,
        [
            step("fill_null", column="charges", strategy="constant", value=0.0),
            step("drop_duplicates"),
        ],
    )
    assert result["before"][1] == {"id": "b", "charges": None, "flag": "1"}
    assert [row["id"] for row in result["after"]] == ["a", "b", "c"]
    assert result["removed_rows"] == [2]
    assert result["changed_cells"] == [{"row": 1, "column": "charges"}]
    assert result["summary"] == {
        "rows_before": 4,
        "rows_after": 3,
        "rows_removed": 1,
        "values_changed": 1,
        "columns_added": [],
        "columns_removed": [],
        "columns_renamed": [],
    }


def test_statistics_use_the_full_dataset_not_only_the_sample():
    result = CleaningPreviewer(limit=2).preview(
        FRAME, [step("fill_null", column="charges", strategy="mean")]
    )
    assert len(result["before"]) == 2
    assert result["after"][1]["charges"] == 3.0
    assert result["summary"]["values_changed"] == 2


def test_type_conversion_with_equal_text_is_not_a_change():
    result = CleaningPreviewer().preview(
        FRAME, [step("convert_type", column="flag", to="integer")]
    )
    assert result["after"][0]["flag"] == 0
    assert result["changed_cells"] == []
    assert result["summary"]["values_changed"] == 0
    assert {"name": "flag", "type": "Int64", "nullable": True} in result["columns"]


def test_column_changes_are_reported_and_renamed_values_compared():
    result = CleaningPreviewer().preview(
        FRAME,
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
        ],
    )
    summary = result["summary"]
    assert summary["columns_added"] == ["key"]
    assert summary["columns_removed"] == ["flag"]
    assert summary["columns_renamed"] == [{"from": "charges", "to": "total"}]
    assert summary["values_changed"] == 2
    assert {"row": 1, "column": "total"} in result["changed_cells"]
    assert [column["name"] for column in result["columns_before"]] == [
        "id",
        "charges",
        "flag",
    ]


def test_disabled_steps_are_skipped():
    result = CleaningPreviewer().preview(
        FRAME, [{**step("drop_duplicates"), "enabled": False}]
    )
    assert result["removed_rows"] == []
    assert result["summary"]["rows_after"] == 4


def test_invalid_step_error_names_its_position():
    with pytest.raises(InvalidTransformationError, match=r"^Step 2: ") as error:
        CleaningPreviewer().preview(
            FRAME,
            [
                step("drop_duplicates"),
                step("fill_null", column="nope", strategy="mean"),
            ],
        )
    assert error.value.details == {"step": 1}


def test_execution_failure_error_names_its_position():
    frame = pl.DataFrame({"x": ["1", "bad"]}).lazy()
    with pytest.raises(InvalidTransformationError, match=r"^Step 1: 1 value in 'x'"):
        CleaningPreviewer().preview(
            frame, [step("convert_type", column="x", to="integer")]
        )


def test_preview_rows_are_bounded_by_limit():
    frame = pl.DataFrame({"x": list(range(10))}).lazy()
    result = CleaningPreviewer(limit=3).preview(frame, [step("drop_duplicates")])
    assert len(result["before"]) == 3 and len(result["after"]) == 3
    assert result["summary"]["rows_before"] == 10
