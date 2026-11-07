from forma_engine.profiling.tools.duplicates import duplicates


def test_duplicates_for_a_key_column(tools_frame, tool_context):
    result = duplicates(tool_context(tools_frame), {"columns": ["email"]})

    assert result["columns"] == ["email"]
    assert result["duplicate_rows"] == 10
    assert result["group_count"] == 10
    assert len(result["groups"]) == 10
    assert result["groups"][0] == {"values": ["user0@example.com"], "size": 2}
    # equal sizes keep the order of first appearance
    assert [group["values"][0] for group in result["groups"]][:3] == [
        "user0@example.com",
        "user1@example.com",
        "user2@example.com",
    ]


def test_all_columns_match_the_profile(mixed_frame, tool_context):
    context = tool_context(mixed_frame)
    result = duplicates(context, {"columns": None})

    assert result["columns"] == mixed_frame.columns
    assert result["duplicate_rows"] == context.profile["duplicate_rows"] == 3
    assert result["group_count"] == 3


def test_at_most_20_groups_largest_first(tools_frame, tool_context):
    flat = duplicates(tool_context(tools_frame), {"columns": ["flat"]})
    assert flat["duplicate_rows"] == 99
    assert flat["groups"] == [{"values": ["7"], "size": 100}]

    names = duplicates(tool_context(tools_frame), {"columns": ["full_name"]})
    sizes = [group["size"] for group in names["groups"]]
    assert len(sizes) == 20 and sizes == sorted(sizes, reverse=True)
    # 63 distinct names in 100 rows: 37 names appear twice
    assert names["group_count"] == names["duplicate_rows"] == 37
