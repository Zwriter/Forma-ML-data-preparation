import re

from forma_engine.profiling.html_charts import hbars_svg, ring_svg, vbars_svg

QUALITY = {
    "total_cells": 100,
    "valid_cells": 90,
    "missing_cells": 7,
    "invalid_cells": 3,
    "completeness": 0.9,
}


def test_ring_shows_completeness_and_one_titled_arc_per_class():
    svg = ring_svg(QUALITY)
    assert svg.startswith("<svg") and svg.endswith("</svg>")
    assert "90.0%" in svg
    assert re.findall(r"<title>(.*?)</title>", svg) == [
        "Valid: 90 (90.0%)",
        "Missing: 7 (7.0%)",
        "Invalid: 3 (3.0%)",
    ]


def test_ring_with_no_cells_shows_a_dash():
    empty = dict(
        QUALITY, total_cells=0, valid_cells=0, missing_cells=0, invalid_cells=0
    )
    assert "—" in ring_svg(empty | {"completeness": None})


def test_bars_escape_labels_and_title_every_bar():
    items = [("<script>", 30), ("a&b", 10)]
    for svg in (hbars_svg(items, 100), vbars_svg(items, 100)):
        assert "<script>" not in svg
        assert "&lt;script&gt;" in svg and "a&amp;b" in svg
        assert re.findall(r"<title>(.*?)</title>", svg) == [
            "&lt;script&gt;: 30 (30.0%)",
            "a&amp;b: 10 (10.0%)",
        ]
        assert "http" not in svg and "href" not in svg


def test_bars_scale_to_the_largest_value():
    svg = hbars_svg([("big", 50), ("half", 25)], 100)
    widths = [float(w) for w in re.findall(r'<rect[^>]*width="([\d.]+)"', svg)]
    assert widths[0] == 2 * widths[1]


def test_empty_bars_render_a_note():
    assert "No data" in hbars_svg([], 0)
    assert "No data" in vbars_svg([], 0)
