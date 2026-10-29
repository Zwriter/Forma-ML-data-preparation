import polars as pl
from forma_engine.services.step_validator import StepValidator

FRAME = pl.DataFrame({"a": [1, None], "b": ["x", "y"]}).lazy()


def step(kind: str, step_id: str, enabled: bool = True, **parameters) -> dict:
    return {
        "type": kind,
        "parameters": parameters,
        "enabled": enabled,
        "operation_id": step_id,
    }


def test_valid_steps_report_each_index():
    result = StepValidator().validate(
        FRAME,
        [
            step("drop_duplicates", "s1"),
            step("fill_null", "s2", column="a", strategy="mean"),
        ],
    )
    assert result == {
        "valid": True,
        "steps": [
            {"index": 0, "operation_id": "s1", "valid": True},
            {"index": 1, "operation_id": "s2", "valid": True},
        ],
    }


def test_steps_validate_against_columns_from_preceding_steps():
    result = StepValidator().validate(
        FRAME,
        [
            step("rename_columns", "s1", mapping={"a": "amount"}),
            step("fill_null", "s2", column="a", strategy="previous"),
            step("fill_null", "s3", column="amount", strategy="previous"),
        ],
    )
    assert result["valid"] is False
    assert [item["valid"] for item in result["steps"]] == [True, False, True]
    assert result["steps"][1]["message"] == "Select an existing column."


def test_invalid_step_is_skipped_so_later_steps_use_previous_columns():
    result = StepValidator().validate(
        FRAME,
        [
            step("drop_columns", "s1", columns=["missing"]),
            step("fill_null", "s2", column="a", strategy="previous"),
        ],
    )
    assert [item["valid"] for item in result["steps"]] == [False, True]


def test_disabled_steps_are_not_applied_or_checked():
    result = StepValidator().validate(
        FRAME,
        [
            step("drop_columns", "s1", enabled=False, columns=["a"]),
            step("fill_null", "s2", column="a", strategy="previous"),
            step("unknown", "s3", enabled=False),
        ],
    )
    assert result["valid"] is True


def test_unsupported_or_malformed_steps_are_reported_not_raised():
    result = StepValidator().validate(FRAME, [{"type": "evil"}, "not-an-object"])
    assert [item["valid"] for item in result["steps"]] == [False, False]
