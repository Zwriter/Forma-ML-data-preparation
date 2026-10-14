import polars as pl
from forma_engine.profiling.statistics import profile

def test_profile_reports_missing_distinct_numeric_and_frequency_values():
    frame = pl.DataFrame({"value": [1, 2, None], "kind": ["a", "a", "b"]}).lazy()
    result = profile(frame, "d1")
    assert result["row_count"] == 3
    assert result["missing_counts"]["value"] == 1
    assert result["distinct_counts"]["kind"] == 2
    assert result["numeric_summaries"]["value"]["mean"] == 1.5
    assert result["categorical_frequencies"]["kind"][0]["len"] == 2
    assert result["duplicate_count"] == 0

def test_profile_counts_duplicate_rows_and_empty_values():
    result = profile(pl.DataFrame({"x": [None, None]}).lazy(), "d2")
    assert result["row_count"] == 2
    assert result["missing_counts"]["x"] == 2
    assert result["duplicate_count"] == 1
