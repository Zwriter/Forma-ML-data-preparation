import pytest

from forma_engine.domain.errors import CancelledError
from forma_engine.profiling.statistics import profile


class Token:
    def __init__(self, cancel_after=None):
        self.reports, self.cancel_after = [], cancel_after

    def __call__(self):
        return self.cancel_after is not None and len(self.reports) > self.cancel_after

    def report(self, fraction, message):
        self.reports.append((fraction, message))


def run(frame, token=None):
    return profile(frame.lazy(), "d1", "h1", "v1", token or Token())


def test_profile_summarises_the_mixed_frame(mixed_frame):
    result = run(mixed_frame)

    assert result["dataset_id"] == "d1"
    assert (result["history_id"], result["data_version"]) == ("h1", "v1")
    assert result["computed_at"].endswith("Z")
    assert (result["row_count"], result["column_count"]) == (63, 7)
    assert result["missing_cells"] == 6 + 7 + 1 + 1 + 1
    assert result["duplicate_rows"] == 3
    quality = result["quality"]
    assert quality["invalid_cells"] == 2
    assert quality["valid_cells"] + quality["missing_cells"] + 2 == 63 * 7


def test_columns_carry_types_counts_quality_and_examples(mixed_frame):
    columns = {column["name"]: column for column in run(mixed_frame)["columns"]}

    amount = columns["amount"]
    assert amount["position"] == 6
    assert (amount["stored_type"], amount["detected_type"]) == ("String", "decimal")
    assert (amount["missing_count"], amount["invalid_count"]) == (1, 2)
    assert amount["completeness"] == (63 - 3) / 63
    assert amount["quality"] == "poor"  # 2/63 invalid is over 1%
    assert columns["id"]["quality"] == "good"
    assert columns["price"]["quality"] == "needs_attention"  # 57/63 = 90.5%
    assert columns["name"]["quality"] == "poor"  # 56/63 = 88.9%
    assert columns["reject_reason"]["examples"] == ["keep"]


def test_numbers_and_dates_get_histograms_and_text_gets_top_values(mixed_frame):
    columns = {column["name"]: column for column in run(mixed_frame)["columns"]}

    for name in ("id", "price", "joined", "amount"):
        assert columns[name]["numeric"]["histogram"], name
        assert columns[name]["categories"] is None, name
    for name in ("name", "active", "reject_reason"):
        assert columns[name]["categories"]["top"], name
        assert columns[name]["numeric"] is None, name
    amount = columns["amount"]["numeric"]
    assert sum(b["count"] for b in amount["histogram"]) == 63 - 1 - 2
    assert columns["reject_reason"]["categories"]["top"] == [
        {"value": "keep", "count": 63}
    ]


def test_progress_is_reported_per_phase_and_cancel_stops_work(mixed_frame):
    token = Token()
    run(mixed_frame, token)
    assert [message for _, message in token.reports][:4] == [
        "Detecting types",
        "Computing column statistics",
        "Finding duplicates",
        "Building distributions",
    ]
    assert token.reports[-1][0] < 1  # the job itself marks completion

    with pytest.raises(CancelledError):
        run(mixed_frame, Token(cancel_after=1))


def test_empty_frame_profiles_without_error(empty_frame):
    result = run(empty_frame)
    assert result["row_count"] == 0
    assert result["quality"]["completeness"] is None
    assert result["duplicate_rows"] == 0
    assert result["columns"][0]["completeness"] is None
