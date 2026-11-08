import polars as pl


def test_mixed_frame_has_the_facts_profile_tests_rely_on(mixed_frame):
    assert mixed_frame.height == 63
    assert mixed_frame.height - mixed_frame.unique().height == 3
    assert mixed_frame.null_count().row(0, named=True) == {
        "id": 0,
        "price": 6,
        "name": 7,
        "active": 1,
        "joined": 1,
        "amount": 1,
        "reject_reason": 0,
    }
    amount = mixed_frame["amount"].drop_nulls()
    parsed = amount.cast(pl.Float64, strict=False)
    assert sorted(amount.filter(parsed.is_null())) == ["12,5", "n/a"]
    assert parsed.is_not_null().sum() / amount.len() >= 0.95
    assert amount.cast(pl.Int64, strict=False).is_not_null().sum() / amount.len() < 0.95


def test_empty_frame_and_csv_writer(empty_frame, write_csv):
    assert empty_frame.height == 0
    path = write_csv(empty_frame, "empty.csv")
    assert path.read_text().strip() == ",".join(empty_frame.columns)
