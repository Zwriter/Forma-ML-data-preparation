import statistics
from datetime import date

import polars as pl

from forma_engine.profiling.column_stats import column_stats, examples
from forma_engine.profiling.type_detection import detect_types


def test_counts_match_hand_computed_values(mixed_frame):
    rows, stats = column_stats(mixed_frame.lazy(), detect_types(mixed_frame.lazy()))

    assert rows == 63
    for name in mixed_frame.columns:
        values = mixed_frame[name].to_list()
        present = [value for value in values if value is not None]
        assert stats[name]["missing"] == len(values) - len(present), name
        assert stats[name]["unique"] == len(set(present)), name
    assert stats["amount"]["invalid"] == 2
    assert stats["price"]["invalid"] == 0


def test_numeric_stats_use_parsed_values_and_skip_invalid(mixed_frame):
    _, stats = column_stats(mixed_frame.lazy(), detect_types(mixed_frame.lazy()))
    amounts = [
        float(value)
        for value in mixed_frame["amount"].to_list()
        if value not in (None, "n/a", "12,5")
    ]

    numeric = stats["amount"]["numeric"]
    assert numeric["mean"] == statistics.mean(amounts)
    assert numeric["median"] == statistics.median(amounts)
    assert round(numeric["std"], 9) == round(statistics.stdev(amounts), 9)
    assert (numeric["min"], numeric["max"]) == (min(amounts), max(amounts))
    assert stats["name"]["numeric"] is None
    assert stats["active"]["numeric"] is None


def test_datetime_stats_are_iso_strings_with_std_in_seconds():
    frame = pl.DataFrame({"d": [date(2024, 1, 1), None, date(2024, 1, 3)]})
    _, stats = column_stats(frame.lazy(), {"d": "datetime"})

    numeric = stats["d"]["numeric"]
    assert numeric["min"] == "2024-01-01"
    assert numeric["max"] == "2024-01-03"
    assert numeric["mean"] == numeric["median"] == "2024-01-02T00:00:00"
    assert round(numeric["std"]) == 122188  # sample std of the epoch seconds


def test_examples_are_up_to_three_distinct_present_values_as_text(mixed_frame):
    result = examples(mixed_frame.lazy(), detect_types(mixed_frame.lazy()))

    assert result["name"] == ["name0", "name1", "name2"]
    assert result["active"] == ["true", "false"]
    assert result["joined"] == ["2024-01-01", "2024-01-02", "2024-01-03"]
    assert result["reject_reason"] == ["keep"]


def test_empty_frame_gives_zero_rows_and_no_stats(empty_frame):
    rows, stats = column_stats(empty_frame.lazy(), detect_types(empty_frame.lazy()))
    assert rows == 0
    assert stats["price"] == {"missing": 0, "invalid": 0, "unique": 0, "numeric": None}
    assert examples(empty_frame.lazy(), {"price": "decimal"}) == {"price": []}
