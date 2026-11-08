import time

import pytest

from forma_engine.bootstrap import build_router
from forma_engine.domain.errors import ProfileStaleError, RequestError


def finished(jobs, job_id):
    for _ in range(300):
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
    yield router, jobs, dataset_id, version
    jobs.shutdown()


def test_report_job_writes_the_file(profiled, tmp_path):
    router, jobs, dataset_id, version = profiled
    target = tmp_path / "profile.html"
    ack = router.dispatch(
        "profile.report",
        {"dataset_id": dataset_id, "data_version": version, "destination": str(target)},
    )
    status = finished(jobs, ack["job_id"])
    assert status["kind"] == "profile_report" and status["state"] == "completed"
    assert set(status["result"]) == {"destination", "bytes", "replaced_existing"}
    assert target.read_text(encoding="utf-8").startswith("<!doctype html>")


def test_stale_versions_and_bad_requests_are_refused(profiled, tmp_path):
    router, _, dataset_id, version = profiled
    base = {"dataset_id": dataset_id, "destination": str(tmp_path / "p.html")}
    with pytest.raises(ProfileStaleError):
        router.dispatch("profile.report", base | {"data_version": "old"})
    for bad in (
        {"destination": " "},
        {"force_overwrite": "yes"},
        {"distribution_column": 5},
        {"category_column": "price"},
    ):
        with pytest.raises(RequestError):
            router.dispatch("profile.report", base | {"data_version": version} | bad)
