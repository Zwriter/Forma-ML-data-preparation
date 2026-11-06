import polars as pl

from forma_engine.profiling.rejects import reason_column_name, rejected_rows
from forma_engine.profiling.type_detection import detect_types


def rejects(frame: pl.DataFrame, scope=None) -> pl.DataFrame:
    lazy = frame.lazy()
    return rejected_rows(lazy, detect_types(lazy), scope).collect()


def test_reason_column_name_never_overwrites_a_column():
    assert reason_column_name(["a", "b"]) == "reject_reason"
    assert reason_column_name(["reject_reason"]) == "reject_reason_1"
    assert reason_column_name(["reject_reason", "reject_reason_1"]) == "reject_reason_2"


def test_mixed_frame_rejects_exactly_the_invalid_rows_in_stored_order(mixed_frame):
    result = rejects(mixed_frame)

    assert result.columns == [*mixed_frame.columns, "reject_reason_1"]
    assert result["id"].to_list() == [3, 10]
    assert result["reject_reason_1"].to_list() == [
        'amount: "n/a" is not a decimal number',
        'amount: "12,5" is not a decimal number',
    ]
    # Original values are untouched.
    assert result.drop("reject_reason_1").equals(
        mixed_frame.filter(pl.col("id").is_in([3, 10]))
    )


def test_rows_list_every_invalid_cell_in_column_order():
    frame = pl.DataFrame(
        {
            "n": [str(i) for i in range(40)] + ["x", "5"],
            "d": ["2024-01-01"] * 40 + ["soon", "later"],
        }
    )
    result = rejects(frame)
    assert result["reject_reason"].to_list() == [
        'n: "x" is not an integer; d: "soon" is not a date/time',
        'd: "later" is not a date/time',
    ]


def test_one_column_scope_and_long_or_quoted_values():
    long = "y" * 80
    frame = pl.DataFrame(
        {
            "n": [str(i) for i in range(40)] + ['say "hi"', "1"],
            "m": [str(i) for i in range(40)] + ["1", long],
        }
    )
    only_n = rejects(frame, scope="n")
    assert only_n["reject_reason"].to_list() == ['n: "say "hi"" is not an integer']

    only_m = rejects(frame, scope="m")
    assert only_m["reject_reason"].to_list() == [f'm: "{"y" * 60}…" is not an integer']


def test_row_count_matches_the_profile_invalid_rows(mixed_frame):
    lazy = mixed_frame.lazy()
    types = detect_types(lazy)
    assert rejected_rows(lazy, types, None).collect().height == 2
    assert rejected_rows(lazy, types, "price").collect().height == 0
