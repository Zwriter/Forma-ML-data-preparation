import polars as pl
from statistics import correlation

from forma_engine.profiling.tools.correlations import correlations


def test_matrix_matches_a_reference_on_pairwise_valid_rows(tools_frame, tool_context):
    result = correlations(tool_context(tools_frame))
    names = result["columns"]
    # number columns only (dates and text are left out), most complete first
    assert set(names) == {"x", "y", "z", "spend", "flat", "amount_text"}
    assert names[-1] == "amount_text"  # 3% missing
    assert result["left_out"] == 0

    x, y = names.index("x"), names.index("y")
    expected = correlation(tools_frame["x"], tools_frame["y"])
    assert abs(result["matrix"][x][y] - expected) < 1e-9
    assert result["matrix"][x][x] == 1.0

    # text-stored numbers use parsed values on rows where both are present
    a = names.index("amount_text")
    both = tools_frame.filter(pl.col("amount_text").is_not_null())
    expected = correlation(both["x"], both["amount_text"].cast(pl.Float64))
    assert abs(result["matrix"][x][a] - expected) < 1e-9

    # a constant column has no correlation
    assert result["matrix"][x][names.index("flat")] is None


def test_strongest_pairs_by_absolute_value(tools_frame, tool_context):
    strongest = correlations(tool_context(tools_frame))["strongest"]
    assert len(strongest) == 5
    pairs = [{s["a"], s["b"]} for s in strongest]
    assert {"x", "y"} in pairs and {"x", "amount_text"} in pairs
    sizes = [abs(s["r"]) for s in strongest]
    assert sizes == sorted(sizes, reverse=True)


def test_pairs_with_fewer_than_10_shared_rows_are_null(tool_context):
    frame = pl.DataFrame(
        {
            "a": [float(i) for i in range(20)],
            "b": [float(i) if i < 9 else None for i in range(20)],
        }
    )
    result = correlations(tool_context(frame))
    assert result["matrix"][0][1] is None
    assert result["matrix"][1][1] is None
    assert result["strongest"] == []


def test_at_most_20_columns_most_complete_first(tool_context):
    data = {f"c{i}": [float(j * (i + 1)) for j in range(12)] for i in range(22)}
    data["c21"][0] = None
    data["c3"][0] = None
    result = correlations(tool_context(pl.DataFrame(data)))
    assert len(result["columns"]) == 20
    assert result["left_out"] == 2
    assert "c21" not in result["columns"] and "c3" not in result["columns"]
