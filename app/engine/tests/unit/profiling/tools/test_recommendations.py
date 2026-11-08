from forma_engine.profiling.tools.recommendations import recommendations
from forma_engine.transformations.executor import execute


def by_id(found):
    return {item["id"]: item for item in found}


def test_rules_on_the_tools_frame(tools_frame, tool_context):
    found = recommendations(tool_context(tools_frame))
    assert [item["id"] for item in found] == [
        "drop_constant:flat",
        "drop_empty:notes",
        "convert:amount_text",
        "fill_missing:amount_text",
    ]
    items = by_id(found)
    assert items["drop_constant:flat"]["steps"] == [
        {"type": "drop_columns", "parameters": {"columns": ["flat"]}}
    ]
    assert items["drop_empty:notes"]["cells_affected"] == 100
    assert items["convert:amount_text"]["steps"] == [
        {
            "type": "convert_type",
            "parameters": {
                "column": "amount_text",
                "to": "integer",
                "on_error": "null",
            },
        }
    ]
    assert items["convert:amount_text"]["cells_affected"] == 97
    # a text-stored number is converted before its median fill
    fill = items["fill_missing:amount_text"]
    assert [step["type"] for step in fill["steps"]] == ["convert_type", "fill_null"]
    assert fill["steps"][1]["parameters"] == {
        "column": "amount_text",
        "strategy": "median",
    }
    assert fill["cells_affected"] == 3
    assert "3 missing" in fill["detail"]
    assert all(item["examples"] is None for item in found)


def test_fill_duplicates_and_invalid_values_on_the_mixed_frame(
    mixed_frame, tool_context
):
    items = by_id(recommendations(tool_context(mixed_frame)))
    assert items["remove_duplicates"]["steps"] == [
        {"type": "drop_duplicates", "parameters": {}}
    ]
    assert items["remove_duplicates"]["cells_affected"] == 3 * mixed_frame.width
    assert (
        items["fill_missing:price"]["steps"][-1]["parameters"]["strategy"] == "median"
    )
    assert items["fill_missing:name"]["steps"] == [
        {"type": "fill_null", "parameters": {"column": "name", "strategy": "mode"}}
    ]
    convert = items["convert:amount"]
    assert convert["steps"][0]["parameters"]["to"] == "float"
    assert "2 invalid values will become missing" in convert["detail"]
    assert "drop_constant:reject_reason" in items


def test_every_suggestion_applies_in_card_order(mixed_frame, tools_frame, tool_context):
    for frame in (mixed_frame, tools_frame):
        found = recommendations(tool_context(frame))
        steps = [step for item in found for step in item["steps"]]
        execute(frame.lazy(), steps).collect()  # raises on an invalid step


def test_ids_are_stable(tools_frame, tool_context):
    first = recommendations(tool_context(tools_frame))
    again = recommendations(tool_context(tools_frame))
    assert [item["id"] for item in first] == [item["id"] for item in again]
