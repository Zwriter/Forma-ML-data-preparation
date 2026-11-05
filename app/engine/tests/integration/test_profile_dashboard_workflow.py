import time

import polars as pl
import pytest

from forma_engine.bootstrap import build_router


def finished(jobs, job_id):
    for _ in range(1000):
        status = jobs.status(job_id)
        if status["state"] in {"completed", "failed", "cancelled"}:
            return status
        time.sleep(0.01)
    raise AssertionError("job did not finish")


@pytest.fixture
def router_jobs():
    router, jobs = build_router()
    yield router, jobs
    jobs.shutdown()


def open_csv(router, path):
    return router.dispatch("dataset.open", {"path": str(path)})["dataset_id"]


def test_profiling_an_opened_csv_matches_reference_counts(
    router_jobs, mixed_frame, write_csv
):
    router, jobs = router_jobs
    path = write_csv(mixed_frame, "mixed.csv")
    source = path.read_bytes()
    dataset_id = open_csv(router, path)

    ack = router.dispatch("dataset.profile", {"dataset_id": dataset_id})
    result = finished(jobs, ack["job_id"])["result"]

    assert (result["row_count"], result["column_count"]) == (63, 7)
    assert result["duplicate_rows"] == 3
    assert result["missing_cells"] == sum(mixed_frame.null_count().row(0))
    quality = result["quality"]
    assert quality["invalid_cells"] == 2
    assert quality["valid_cells"] == 63 * 7 - result["missing_cells"] - 2
    by_name = {column["name"]: column for column in result["columns"]}
    assert by_name["amount"]["detected_type"] == "decimal"
    assert by_name["amount"]["invalid_count"] == 2
    assert path.read_bytes() == source  # profiling never touches the file


def test_cancelling_a_large_profile_stores_no_result(router_jobs, tmp_path):
    router, jobs = router_jobs
    path = tmp_path / "large.csv"
    rows = 1_000_000
    pl.DataFrame(
        {
            "id": range(rows),
            "text": [str(i % 977) for i in range(rows)],
            "value": [i * 0.5 for i in range(rows)],
        }
    ).write_csv(path)
    dataset_id = open_csv(router, path)

    ack = router.dispatch("dataset.profile", {"dataset_id": dataset_id})
    router.dispatch("job.cancel", {"job_id": ack["job_id"]})
    status = finished(jobs, ack["job_id"])

    assert status["state"] == "cancelled"
    assert router.profile_service.latest(router.datasets.history_id(dataset_id)) is None
