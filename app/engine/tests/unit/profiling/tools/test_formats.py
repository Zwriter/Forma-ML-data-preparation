import polars as pl

from forma_engine.profiling.tools.formats import formats


def by_column(result):
    return {item["column"]: item for item in result}


def test_value_shapes_with_counts_and_shares(tools_frame, tool_context):
    found = by_column(formats(tool_context(tools_frame)))
    # text columns only; the text-stored number column is detected as integer
    assert set(found) == {"phone", "email", "notes", "full_name"}

    phone = found["phone"]
    assert phone["formats"] == [
        {"shape": "999-9999", "count": 90, "share": 0.9},
        {"shape": "9999999", "count": 10, "share": 0.1},
    ]
    assert phone["mixed"] is False  # exactly 90% is not mixed
    assert found["full_name"]["formats"][0]["shape"] == "AAAA9, AAAAA9"
    # shares count present values only
    assert found["notes"]["formats"] == [{"shape": "AAAAAAA", "count": 5, "share": 1.0}]


def test_top_five_cut_to_30_and_mixed_below_90_percent(tool_context):
    values = ["a1", "b2", "c3", "dd", "11", "?!", "x" * 40, "é-1"] + ["zz9"] * 2
    found = formats(tool_context(pl.DataFrame({"code": values})))[0]
    assert len(found["formats"]) == 5
    assert found["formats"][0] == {"shape": "A9", "count": 3, "share": 0.3}
    assert found["mixed"] is True

    long = formats(tool_context(pl.DataFrame({"t": ["x" * 40]})))[0]
    assert long["formats"][0]["shape"] == "A" * 30
    assert (
        formats(tool_context(pl.DataFrame({"t": ["é-1"]})))[0]["formats"][0]["shape"]
        == "A-9"
    )


def test_an_empty_text_column_has_no_formats(tool_context):
    frame = pl.DataFrame({"t": [None, None]}, schema={"t": pl.String})
    assert formats(tool_context(frame)) == [
        {"column": "t", "formats": [], "mixed": False}
    ]
