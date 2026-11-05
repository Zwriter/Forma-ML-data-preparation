import polars as pl
import pytest

from forma_engine.profiling.type_detection import detect_types, invalid_mask, parsed


def invalid_count(frame: pl.DataFrame, name: str, detected: str) -> int:
    mask = invalid_mask(name, detected, frame.schema[name])
    return frame.select(mask.sum()).item()


def test_mixed_frame_types(mixed_frame):
    assert detect_types(mixed_frame.lazy()) == {
        "id": "integer",
        "price": "decimal",
        "name": "text",
        "active": "boolean",
        "joined": "datetime",
        "amount": "decimal",
        "reject_reason": "text",
    }


def test_invalid_values_are_present_values_that_fail_the_detected_type(mixed_frame):
    assert invalid_count(mixed_frame, "amount", "decimal") == 2
    assert invalid_count(mixed_frame, "name", "text") == 0
    assert invalid_count(mixed_frame, "price", "decimal") == 0  # typed: never invalid


@pytest.mark.parametrize(
    ("values", "expected"),
    [
        ([" 1", "2 ", "3"], "integer"),
        (["2024-01-31", "2024-02-01 10:30:00", "2024-03-01T08:00:00"], "datetime"),
        (["true", "FALSE", "True"], "boolean"),
        (["1", "0"], "integer"),  # integer wins over boolean
        (["a", "b"], "text"),
        ([None, None], "text"),
    ],
)
def test_text_columns_take_the_first_matching_candidate(values, expected):
    frame = pl.DataFrame({"v": values}, schema={"v": pl.String})
    assert detect_types(frame.lazy()) == {"v": expected}


def test_the_95_percent_threshold_is_inclusive():
    at_threshold = pl.DataFrame({"v": [str(i) for i in range(19)] + ["x"]})
    below = pl.DataFrame({"v": [str(i) for i in range(18)] + ["x", "y"]})

    assert detect_types(at_threshold.lazy()) == {"v": "integer"}
    assert invalid_count(at_threshold, "v", "integer") == 1
    assert detect_types(below.lazy()) == {"v": "text"}


def test_nulls_are_never_invalid_and_parsed_gives_typed_values():
    frame = pl.DataFrame({"v": ["1.5", None, "bad", "2"]})
    assert invalid_count(frame, "v", "decimal") == 1
    values = frame.select(parsed("v", "decimal", pl.String)).to_series().to_list()
    assert values == [1.5, None, None, 2.0]


def test_other_types_map_to_other():
    from datetime import time

    frame = pl.DataFrame({"v": [[1], [2]], "t": [time(1), time(2)]})
    assert detect_types(frame.lazy()) == {"v": "other", "t": "other"}
