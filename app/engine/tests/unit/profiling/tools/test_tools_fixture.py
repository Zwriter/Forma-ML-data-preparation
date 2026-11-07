"""The tools fixture holds the answers the tool tests rely on; check them once here."""

import polars as pl


def test_tools_frame_has_its_planted_answers(tools_frame):
    frame = tools_frame
    assert frame.height == 100
    assert frame["flat"].n_unique() == 1
    assert frame["notes"].null_count() == 95
    assert frame["amount_text"].null_count() == 3
    assert frame["amount_text"].dtype == pl.String
    # email repeats for rows 90-99: 10 groups of two, 10 duplicate rows
    assert frame.height - frame["email"].n_unique() == 10
    assert frame.select(pl.corr("x", "y")).item() > 0.99
    assert abs(frame.select(pl.corr("x", "z")).item()) < 0.2
    short = frame.filter(~pl.col("phone").str.contains("-"))
    assert short.height == 10
    assert sorted(frame.filter(pl.col("spend").abs() > 100)["spend"].to_list()) == [
        -300,
        500,
    ]
    assert frame["joined"].dtype == pl.Date
    assert frame["full_name"].str.contains(", ").all()
