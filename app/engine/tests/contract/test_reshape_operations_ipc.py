import time

import pytest

from forma_engine.bootstrap import build_router
from forma_engine.domain.errors import FormaError


@pytest.fixture
def app(tmp_path):
    router, jobs = build_router()
    source = tmp_path / "reshape.csv"
    source.write_text(
        "team,period,sales,Jan,Feb\nA,Q1,2,10,20\nA,Q1,3,11,21\nB,Q2,4,12,22\n",
        encoding="utf-8",
    )
    dataset = router.dispatch("dataset.open", {"path": str(source)})
    yield router, jobs, dataset
    jobs.shutdown()


@pytest.mark.parametrize(
    "operation,expected_columns,expected_rows",
    [
        (
            {
                "type": "group_by",
                "parameters": {
                    "group_columns": ["team"],
                    "aggregations": [
                        {"column": "sales", "function": "sum", "output_name": "total"}
                    ],
                },
            },
            ["team", "total"],
            2,
        ),
        (
            {
                "type": "pivot",
                "parameters": {
                    "row_columns": ["team"],
                    "category_column": "period",
                    "value_column": "sales",
                    "function": "sum",
                },
            },
            ["team", "period_Q1", "period_Q2"],
            2,
        ),
        (
            {
                "type": "unpivot",
                "parameters": {
                    "identifier_columns": ["team"],
                    "value_columns": ["Jan", "Feb"],
                    "attribute_name": "month",
                    "value_name": "amount",
                },
            },
            ["team", "month", "amount"],
            6,
        ),
    ],
)
def test_data_apply_queues_reshape_and_returns_committed_metadata(
    app, operation, expected_columns, expected_rows
):
    router, _, dataset = app
    ack = router.dispatch(
        "data.apply",
        {
            "dataset_id": dataset["dataset_id"],
            "operation": operation,
        },
    )
    for _ in range(200):
        job = router.dispatch("job.status", {"job_id": ack["job_id"]})
        if job["state"] in {"completed", "failed", "cancelled"}:
            break
        time.sleep(0.01)
    assert job["state"] == "completed", job
    assert job["result"]["dataset"]["schema"]
    assert [
        column["name"] for column in job["result"]["dataset"]["schema"]
    ] == expected_columns
    assert job["result"]["dataset"]["rows"] == expected_rows
    assert job["result"]["history"]["is_dirty"] is True


def test_reshape_validation_rejects_bad_roles_without_advancing_history(app):
    router, _, dataset = app
    before = router.dispatch("dataset.history", {"dataset_id": dataset["dataset_id"]})
    invalid = [
        {
            "type": "group_by",
            "parameters": {
                "group_columns": ["team"],
                "aggregations": [
                    {"column": "period", "function": "sum", "output_name": "total"},
                ],
            },
        },
        {
            "type": "pivot",
            "parameters": {
                "row_columns": ["team"],
                "category_column": "period",
                "value_column": "team",
                "function": "sum",
            },
        },
        {
            "type": "unpivot",
            "parameters": {
                "identifier_columns": ["team"],
                "value_columns": ["Jan"],
                "attribute_name": "team",
                "value_name": "amount",
            },
        },
    ]
    for operation in invalid:
        with pytest.raises(FormaError):
            router.dispatch(
                "data.apply",
                {
                    "dataset_id": dataset["dataset_id"],
                    "operation": operation,
                },
            )
    after = router.dispatch("dataset.history", {"dataset_id": dataset["dataset_id"]})
    assert after["current_index"] == before["current_index"]
    assert after["is_dirty"] is False


def test_reshape_execution_failure_keeps_current_history_state(app, tmp_path):
    router, _, _ = app
    source = tmp_path / "duplicate-pivot-label.csv"
    source.write_text(
        "team,category,sales\nA,null,2\nA,,3\n",
        encoding="utf-8",
    )
    dataset = router.dispatch("dataset.open", {"path": str(source)})
    before = router.dispatch("dataset.history", {"dataset_id": dataset["dataset_id"]})
    ack = router.dispatch(
        "data.apply",
        {
            "dataset_id": dataset["dataset_id"],
            "operation": {
                "type": "pivot",
                "parameters": {
                    "row_columns": ["team"],
                    "category_column": "category",
                    "value_column": "sales",
                    "function": "sum",
                },
            },
        },
    )
    for _ in range(200):
        job = router.dispatch("job.status", {"job_id": ack["job_id"]})
        if job["state"] in {"completed", "failed", "cancelled"}:
            break
        time.sleep(0.01)
    assert job["state"] == "failed"
    after = router.dispatch("dataset.history", {"dataset_id": dataset["dataset_id"]})
    assert after["current_index"] == before["current_index"]
    assert after["is_dirty"] is False
