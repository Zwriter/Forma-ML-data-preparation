import polars as pl
import pytest

from forma_engine.domain.errors import RequestError
from forma_engine.profiling.tools.distribution_detail import distribution_detail


def test_uses_the_asked_number_of_bars(tools_frame, tool_context):
    context = tool_context(tools_frame)
    for bins in (10, 20, 30, 50):
        detail = distribution_detail(context, {"column": "x", "bins": bins})
        assert len(detail["bins"]) == bins
        assert sum(b["count"] for b in detail["bins"]) == 100
    ten = distribution_detail(context, {"column": "x", "bins": 10})
    assert [b["count"] for b in ten["bins"]] == [10] * 10


def test_box_plot_quartiles_whiskers_and_outliers(tools_frame, tool_context):
    detail = distribution_detail(
        tool_context(tools_frame), {"column": "spend", "bins": 20}
    )
    values = tools_frame["spend"].to_list()
    series = pl.Series(values, dtype=pl.Float64)
    q1 = series.quantile(0.25, "linear")
    q3 = series.quantile(0.75, "linear")
    low, high = q1 - 1.5 * (q3 - q1), q3 + 1.5 * (q3 - q1)

    box = detail["box"]
    assert (box["q1"], box["q3"]) == (q1, q3)
    assert box["median"] == series.median()
    assert box["lower_whisker"] == min(v for v in values if v >= low)
    assert box["upper_whisker"] == max(v for v in values if v <= high)
    assert box["outliers"] == 2  # 500 and -300


def test_date_columns_report_iso_text(tools_frame, tool_context):
    detail = distribution_detail(
        tool_context(tools_frame), {"column": "joined", "bins": 10}
    )
    assert detail["box"]["median"].startswith("2024-")
    assert detail["bins"][0]["start"].startswith("2024-01-01")


def test_text_columns_are_refused(tools_frame, tool_context):
    with pytest.raises(RequestError):
        distribution_detail(tool_context(tools_frame), {"column": "email", "bins": 10})
