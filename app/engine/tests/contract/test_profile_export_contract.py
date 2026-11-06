import time

import polars as pl
import pytest

from forma_engine.bootstrap import build_router
from forma_engine.domain.errors import RequestError


@pytest.fixture
def opened(write_csv, mixed_frame):
    router, jobs = build_router()
    path = write_csv(mixed_frame, "mixed.csv")
    dataset_id = router.dispatch("dataset.open", {"path": str(path)})["dataset_id"]
    version = router.dispatch("dataset.history", {"dataset_id": dataset_id})[
        "data_version"
    ]
    yield router, jobs, dataset_id, version
    jobs.shutdown()


def finished(jobs, job_id):
    for _ in range(300):
        status = jobs.status(job_id)
        if status["state"] in {"completed", "failed", "cancelled"}:
            return status
        time.sleep(0.01)
    raise AssertionError("export job did not finish")


def request(dataset_id, version, destination, **extra):
    return {
        "dataset_id": dataset_id,
        "data_version": version,
        "column": None,
        "destination": str(destination),
        "format": "csv",
        "force_overwrite": False,
    } | extra


def test_export_invalid_runs_as_a_job_and_returns_the_write_result(opened, tmp_path):
    router, jobs, dataset_id, version = opened
    ack = router.dispatch(
        "profile.export_invalid", request(dataset_id, version, tmp_path / "r.csv")
    )
    status = finished(jobs, ack["job_id"])

    assert status["kind"] == "export_invalid" and status["state"] == "completed"
    assert set(status["result"]) >= {
        "destination",
        "format",
        "row_count",
        "schema",
        "replaced_existing",
        "validated",
        "reason_column",
    }
    assert pl.read_csv(tmp_path / "r.csv").height == 2


def test_an_empty_scope_fails_the_job_with_invalid_request(opened, tmp_path):
    router, jobs, dataset_id, version = opened
    ack = router.dispatch(
        "profile.export_invalid",
        request(dataset_id, version, tmp_path / "r.csv", column="price"),
    )
    assert finished(jobs, ack["job_id"])["error"]["code"] == "INVALID_REQUEST"


@pytest.mark.parametrize(
    "bad",
    [
        {"dataset_id": ""},
        {"data_version": 7},
        {"column": 3},
        {"destination": " "},
        {"format": "xlsx"},
        {"force_overwrite": "yes"},
    ],
)
def test_malformed_requests_are_rejected(opened, tmp_path, bad):
    router, _, dataset_id, version = opened
    with pytest.raises(RequestError):
        router.dispatch(
            "profile.export_invalid",
            request(dataset_id, version, tmp_path / "r.csv") | bad,
        )
