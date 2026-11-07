import polars as pl

from forma_engine.profiling.tools.outliers import anomalies


def by_column(result):
    return {item["column"]: item for item in result["columns"]}


def test_iqr_bounds_counts_and_extremes(tools_frame, tool_context):
    result = anomalies(tool_context(tools_frame), {})
    # number and date columns only, most outliers first
    assert result["columns"][0]["column"] == "spend"
    found = by_column(result)
    assert set(found) == {"x", "y", "z", "spend", "flat", "amount_text", "joined"}

    spend = found["spend"]
    values = tools_frame["spend"].cast(pl.Float64)
    q1, q3 = values.quantile(0.25, "linear"), values.quantile(0.75, "linear")
    assert spend["low"] == q1 - 1.5 * (q3 - q1)
    assert spend["high"] == q3 + 1.5 * (q3 - q1)
    assert spend["count"] == 2 and spend["share"] == 0.02
    assert spend["extremes"] == ["500", "-300"]  # furthest outside first
    assert spend["note"] is None

    assert found["x"]["count"] == 0 and found["x"]["extremes"] == []
    assert found["joined"]["low"].startswith("2023-")  # dates as ISO text


def test_no_spread_when_iqr_is_zero(tools_frame, tool_context):
    flat = by_column(anomalies(tool_context(tools_frame), {}))["flat"]
    assert flat["note"] == "no_spread"
    assert flat["count"] == 0


def test_share_counts_valid_values_and_extremes_stop_at_five(tool_context):
    values = [10.0] * 40 + [None] * 10 + [100.0, -90.0, 200.0, 300.0, -400.0, 150.0]
    found = anomalies(tool_context(pl.DataFrame({"v": values})), {})["columns"][0]
    assert found["count"] == 6
    assert found["share"] == 6 / 46
    assert found["extremes"] == ["-400", "300", "200", "150", "-90"]
