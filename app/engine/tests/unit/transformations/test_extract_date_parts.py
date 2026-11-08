from datetime import date, datetime

import polars as pl
import pytest

from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.executor import execute
from forma_engine.transformations.lineage import initial_lineage, track
from forma_engine.transformations.validators import validate

ALL = ["year", "month", "day", "weekday"]
NAMES = {part: f"joined_{part}" for part in ALL}


def step(column="joined", parts=ALL, names=NAMES):
    return {
        "type": "extract_date_parts",
        "parameters": {"column": column, "parts": parts, "names": names},
    }


def run(frame: pl.DataFrame, operation=None) -> pl.DataFrame:
    return execute(frame.lazy(), [operation or step()]).collect()


def test_adds_int32_parts_after_the_source_column_monday_is_1():
    frame = pl.DataFrame(
        {"id": [1, 2, 3], "joined": [date(2024, 1, 1), None, date(2024, 3, 17)], "x": 0}
    )
    result = run(frame)
    assert result.columns == ["id", "joined", *NAMES.values(), "x"]
    assert all(result.schema[name] == pl.Int32 for name in NAMES.values())
    assert result.row(0)[2:6] == (2024, 1, 1, 1)  # a Monday
    assert result.row(1)[2:6] == (None, None, None, None)
    assert result.row(2)[2:6] == (2024, 3, 17, 7)  # a Sunday


def test_datetime_columns_and_a_subset_of_parts():
    frame = pl.DataFrame({"at": [datetime(2025, 6, 4, 13, 5)]})
    result = run(frame, step("at", ["month"], {"month": "at_month"}))
    assert result.columns == ["at", "at_month"]
    assert result["at_month"].to_list() == [6]


def test_text_dates_use_the_profile_rule_and_bad_values_give_missing_parts():
    # 22 of 23 values are dates, so the profile detects the column as dates
    values = ["2024-02-29", "2024/03/01", "nope"] + [
        f"2024-01-{d:02d}" for d in range(1, 21)
    ]
    result = run(pl.DataFrame({"joined": values}))
    assert result["joined_day"].to_list()[:3] == [29, 1, None]
    assert result["joined"].dtype == pl.String  # the source column is unchanged


def test_text_column_that_is_not_dates_is_refused():
    with pytest.raises(InvalidTransformationError):
        run(pl.DataFrame({"joined": ["a", "b"]}))


@pytest.mark.parametrize(
    "operation",
    [
        step(column="missing"),
        step(parts=[]),
        step(parts=["year", "hour"]),
        step(parts=["year", "year"]),
        step(names={"year": "joined_year"}),  # a name per part
        step(names={**NAMES, "day": "id"}),  # names must be new
        step(names={**NAMES, "day": " "}),
        step(names={**NAMES, "day": "joined_month"}),  # and distinct
    ],
)
def test_invalid_parameters_are_refused(operation):
    with pytest.raises(InvalidTransformationError):
        validate(operation, ["id", "joined"])


def test_number_columns_are_refused_by_schema():
    schema = pl.Schema({"joined": pl.Int64})
    with pytest.raises(InvalidTransformationError):
        validate(step(), ["joined"], schema)


def test_lineage_adds_the_new_columns():
    lineage = track(initial_lineage(["joined"]), step(parts=["year"]))
    assert lineage == {"joined": "joined", "joined_year": None}
