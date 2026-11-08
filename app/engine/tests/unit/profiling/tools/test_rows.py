import polars as pl
import pytest

from forma_engine.domain.errors import RequestError
from forma_engine.profiling.tools.rows import rows

PROBLEMS = {"kind": "problems", "column": None}


def reference(frame, column=None):
    """Stored row numbers (1-based) with a missing or invalid cell, found by hand."""
    invalid = {2: "amount", 9: "amount"}  # "n/a" and "12,5" in mixed_frame
    found = []
    for index, row in enumerate(frame.iter_rows(named=True)):
        cells = [name for name, value in row.items() if value is None]
        if index in invalid:
            cells.append(invalid[index])
        if (column is None and cells) or column in cells:
            found.append(index + 1)
    return found


def first_page(context, rule=PROBLEMS):
    return rows(context, {"filter": rule, "offset": 0, "limit": 100})


def test_lists_rows_with_missing_or_invalid_cells_in_stored_order(
    mixed_frame, tool_context
):
    page = first_page(tool_context(mixed_frame))

    expected = reference(mixed_frame)
    assert page["total"] == len(expected)
    assert [row["row"] for row in page["rows"]] == expected
    assert page["columns"] == mixed_frame.columns


def test_marks_each_problem_cell_with_its_kind_and_reason(mixed_frame, tool_context):
    page = first_page(tool_context(mixed_frame))
    by_row = {row["row"]: row for row in page["rows"]}

    invalid = by_row[3]  # stored index 2 holds "n/a"
    assert invalid["marks"]["amount"] == "invalid"
    assert invalid["reasons"]["amount"] == 'amount: "n/a" is not a decimal number'
    assert invalid["values"][mixed_frame.columns.index("amount")] == "n/a"
    missing = by_row[4]  # price is missing when i % 10 == 3
    assert missing["marks"]["price"] == "missing"
    assert missing["values"][mixed_frame.columns.index("price")] is None
    assert "price" not in missing["reasons"]


def test_pages_and_filters_to_one_column(mixed_frame, tool_context):
    context = tool_context(mixed_frame)
    expected = reference(mixed_frame)
    second = rows(context, {"filter": PROBLEMS, "offset": 5, "limit": 5})
    assert [row["row"] for row in second["rows"]] == expected[5:10]
    assert second["offset"] == 5

    page = first_page(context, {"kind": "problems", "column": "amount"})
    assert [row["row"] for row in page["rows"]] == reference(mixed_frame, "amount")


def test_long_values_are_cut_to_200_characters(tool_context):
    frame = pl.DataFrame(
        {"note": ["x" * 300], "gap": [None]}, schema_overrides={"gap": pl.Int64}
    )
    page = first_page(tool_context(frame))
    assert page["total"] == 1
    assert len(page["rows"][0]["values"][0]) == 200


def test_outlier_rows_use_the_anomalies_bounds(tools_frame, tool_context):
    context = tool_context(tools_frame)
    page = first_page(context, {"kind": "outliers", "column": "spend"})
    assert page["total"] == 2
    assert [row["row"] for row in page["rows"]] == [14, 58]  # stored order
    spend = page["columns"].index("spend")
    assert [row["values"][spend] for row in page["rows"]] == ["500", "-300"]
    assert all(row["marks"]["spend"] == "outlier" for row in page["rows"])


def test_outlier_rows_need_a_number_column(tools_frame, tool_context):
    with pytest.raises(RequestError):
        first_page(tool_context(tools_frame), {"kind": "outliers", "column": "email"})
