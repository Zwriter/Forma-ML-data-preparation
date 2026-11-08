from forma_engine.profiling.html_report import render_report
from forma_engine.profiling.statistics import profile


def report_for(frame, **charts):
    result = profile(frame.lazy(), "d1", "h1", "v1")
    return result, render_report(result, "mixed.csv", **charts)


def test_report_is_a_complete_offline_document(mixed_frame):
    _, html = report_for(mixed_frame)
    assert html.startswith("<!doctype html>") and html.rstrip().endswith("</html>")
    for banned in ("http://", "https://", "src=", "<link", "<script"):
        assert banned not in html.lower()


def test_report_holds_the_dashboard_figures_and_every_column(mixed_frame):
    result, html = report_for(mixed_frame)
    assert "mixed.csv" in html
    for figure in ("63", "Rows", "Missing cells", "Duplicate rows", "Data quality"):
        assert figure in html
    assert "Missing values by column" in html
    for column in result["columns"]:
        assert f"<td>{column['name']}</td>" in html
    assert "Needs attention" in html and "Poor" in html


def test_featured_charts_follow_the_request_or_the_defaults(mixed_frame):
    _, default = report_for(mixed_frame)
    assert "Distribution of id" in default and "name (categorical)" in default

    _, chosen = report_for(
        mixed_frame, distribution_column="price", category_column="active"
    )
    assert "Distribution of price" in chosen and "active (categorical)" in chosen


def test_every_value_is_escaped(mixed_frame):
    hostile = mixed_frame.rename({"name": "<script>alert(1)</script>"}).with_columns(
        mixed_frame["reject_reason"].str.replace("keep", "<b>x</b>")
    )
    _, html = report_for(hostile)
    assert "<script>" not in html and "<b>x</b>" not in html
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html
    assert "&lt;b&gt;x&lt;/b&gt;" in html
