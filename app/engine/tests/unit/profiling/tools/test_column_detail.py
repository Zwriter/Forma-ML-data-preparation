import pytest

from forma_engine.domain.errors import RequestError
from forma_engine.profiling.tools.column_detail import column_detail


def test_number_columns_have_quartiles_and_their_profile_summary(
    tools_frame, tool_context
):
    detail = column_detail(tool_context(tools_frame), {"column": "x"})

    assert detail["column"]["name"] == "x"
    assert detail["column"]["numeric"]["histogram"]
    assert detail["quartiles"] == {"q1": 24.75, "median": 49.5, "q3": 74.25}
    assert detail["text_length"] is None
    assert detail["invalid_values"] == []


def test_date_quartiles_are_iso_text(tools_frame, tool_context):
    detail = column_detail(tool_context(tools_frame), {"column": "joined"})
    assert detail["quartiles"]["median"].startswith("2024-05-")


def test_text_columns_have_lengths_and_up_to_50_top_values(tools_frame, tool_context):
    detail = column_detail(tool_context(tools_frame), {"column": "email"})

    assert detail["quartiles"] is None
    assert detail["text_length"] == {"min": 17, "max": 18, "mean": 17.8}
    categories = detail["column"]["categories"]
    assert len(categories["top"]) == 50
    assert categories["top"][0] == {"value": "user0@example.com", "count": 2}
    assert categories["distinct_count"] == 90
    shown = sum(item["count"] for item in categories["top"])
    assert categories["other_count"] == 100 - shown


def test_invalid_values_are_counted_with_the_export_wording(mixed_frame, tool_context):
    detail = column_detail(tool_context(mixed_frame), {"column": "amount"})

    assert detail["invalid_values"] == [
        {
            "value": "12,5",
            "count": 1,
            "reason": 'amount: "12,5" is not a decimal number',
        },
        {"value": "n/a", "count": 1, "reason": 'amount: "n/a" is not a decimal number'},
    ]


def test_needs_a_profile(tools_frame, tool_context):
    context = tool_context(tools_frame)
    without = type(context)(context.frame, context.token, None)
    with pytest.raises(RequestError):
        column_detail(without, {"column": "x"})
