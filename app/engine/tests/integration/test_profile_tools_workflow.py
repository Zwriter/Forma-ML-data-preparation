"""US7 through IPC: profile a file, use each investigate tool, then act on a finding."""

import time

import polars as pl
import pytest

from forma_engine.bootstrap import build_router
from forma_engine.domain.errors import ProfileStaleError


def finished(jobs, job_id):
    for _ in range(1000):
        status = jobs.status(job_id)
        if status["state"] in {"completed", "failed", "cancelled"}:
            return status
        time.sleep(0.01)
    raise AssertionError("job did not finish")


@pytest.fixture
def profiled(write_csv, mixed_frame):
    router, jobs = build_router()
    path = write_csv(mixed_frame, "mixed.csv")
    dataset_id = router.dispatch("dataset.open", {"path": str(path)})["dataset_id"]
    ack = router.dispatch("dataset.profile", {"dataset_id": dataset_id})
    version = finished(jobs, ack["job_id"])["result"]["data_version"]

    def run(method, **params):
        base = {"dataset_id": dataset_id, "data_version": version}
        ack = router.dispatch(method, base | params)
        status = finished(jobs, ack["job_id"])
        assert status["state"] == "completed", status
        return status["result"]

    yield router, jobs, dataset_id, run, pl.read_csv(path, try_parse_dates=True)
    jobs.shutdown()


def test_investigate_tools_match_references(profiled):
    _, _, _, run, frame = profiled

    detail = run("profile.column_detail", column="price")
    prices = frame["price"].drop_nulls()
    assert detail["quartiles"]["median"] == prices.median()
    assert detail["column"]["missing_count"] == frame["price"].null_count()
    amount = run("profile.column_detail", column="amount")
    assert [item["value"] for item in amount["invalid_values"]] == ["12,5", "n/a"]

    page = run("profile.rows", filter={"kind": "problems", "column": "price"}, limit=5)
    nulls = frame.with_row_index("row", 1).filter(pl.col("price").is_null())
    assert page["total"] == nulls.height
    assert [row["row"] for row in page["rows"]] == nulls["row"].head(5).to_list()

    distribution = run("profile.distribution", column="price", bins=10)
    assert len(distribution["bins"]) == 10
    assert sum(b["count"] for b in distribution["bins"]) == prices.len()
    assert distribution["box"]["median"] == prices.median()

    duplicates = run("profile.duplicates", columns=None)
    assert duplicates["duplicate_rows"] == frame.height - frame.n_unique()


def test_removing_found_duplicates_applies_and_makes_tools_out_of_date(profiled):
    router, jobs, dataset_id, run, frame = profiled
    found = run("profile.duplicates", columns=["name"])
    assert found["duplicate_rows"] == frame.height - frame["name"].n_unique()

    step = {"type": "drop_duplicates", "parameters": {"columns": ["name"]}}
    ack = router.dispatch(
        "cleaning.apply", {"dataset_id": dataset_id, "operations": [step]}
    )
    cleaned = finished(jobs, ack["job_id"])["result"]
    assert cleaned["dataset"]["rows"] == frame["name"].n_unique()

    with pytest.raises(ProfileStaleError):
        run("profile.duplicates", columns=["name"])
