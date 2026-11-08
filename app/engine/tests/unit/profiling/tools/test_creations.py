from datetime import date

import polars as pl

from forma_engine.profiling.tools.creations import creations
from forma_engine.transformations.executor import execute


def by_id(found):
    return {item["id"]: item for item in found}


def test_date_parts_and_split_on_the_tools_frame(tools_frame, tool_context):
    items = by_id(creations(tool_context(tools_frame)))
    assert set(items) == {"date_parts:joined", "split:full_name"}

    parts = items["date_parts:joined"]
    assert parts["steps"] == [
        {
            "type": "extract_date_parts",
            "parameters": {
                "column": "joined",
                "parts": ["year", "month", "day", "weekday"],
                "names": {
                    "year": "joined_year",
                    "month": "joined_month",
                    "day": "joined_day",
                    "weekday": "joined_weekday",
                },
            },
        }
    ]
    assert parts["examples"][0] == {
        "before": "2024-01-01",
        "after": ["2024", "1", "1", "1"],
    }
    assert len(parts["examples"]) == 3

    split = items["split:full_name"]
    assert split["steps"][0]["parameters"] == {
        "column": "full_name",
        "separator": ", ",
        "into": ["full_name_1", "full_name_2"],
        "drop_original": False,
    }
    assert split["examples"][0] == {
        "before": "Last0, First0",
        "after": ["Last0", "First0"],
    }


def test_text_dates_and_the_95_percent_same_count_rule(tool_context):
    frame = pl.DataFrame(
        {
            "when": [f"2024-02-{d:02d}" for d in range(1, 21)],
            "path": ["a/b/c"] * 19 + ["a/b"],  # 95% have two "/"
            "loose": ["a;b"] * 18 + ["a"] * 2,  # 90%: not enough
            "words": [
                f"x{i} y z w q" for i in range(20)
            ],  # four spaces: more than three
            "dash": [
                f"left{i} - right" for i in range(20)
            ],  # " - " wins over the single space
        }
    )
    items = by_id(creations(tool_context(frame)))
    assert set(items) == {"date_parts:when", "split:path", "split:dash"}
    assert items["split:path"]["steps"][0]["parameters"]["into"] == [
        "path_1",
        "path_2",
        "path_3",
    ]
    assert items["split:dash"]["steps"][0]["parameters"]["separator"] == " - "


def test_names_that_exist_get_the_next_free_number(tool_context):
    frame = pl.DataFrame(
        {
            "name": ["a b", "c d", "e f"],  # not constant, or Drop would win
            "name_1": ["x"] * 3,
            "d": [date(2024, 1, d) for d in (1, 2, 3)],
            "d_year": [0] * 3,
        }
    )
    items = by_id(creations(tool_context(frame)))
    assert items["split:name"]["steps"][0]["parameters"]["into"] == ["name_2", "name_3"]
    names = items["date_parts:d"]["steps"][0]["parameters"]["names"]
    assert names["year"] == "d_year_1" and names["month"] == "d_month"


def test_every_creation_applies(tools_frame, tool_context):
    found = creations(tool_context(tools_frame))
    steps = [step for item in found for step in item["steps"]]
    result = execute(tools_frame.lazy(), steps).collect()
    assert "joined_weekday" in result.columns and "full_name_2" in result.columns
