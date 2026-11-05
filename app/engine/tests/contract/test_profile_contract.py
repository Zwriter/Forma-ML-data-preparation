import time

import pytest

from forma_engine.bootstrap import build_router
from forma_engine.domain.errors import RequestError

PROFILE_KEYS = {
    "dataset_id",
    "history_id",
    "data_version",
    "computed_at",
    "row_count",
    "column_count",
    "missing_cells",
    "duplicate_rows",
    "quality",
    "columns",
}
COLUMN_KEYS = {
    "position",
    "name",
    "stored_type",
    "detected_type",
    "missing_count",
    "invalid_count",
    "unique_count",
    "completeness",
    "quality",
    "examples",
    "numeric",
    "categories",
}


class Recorder:
    def __init__(self):
        self.events = []

    def publish(self, event):
        self.events.append(event)


@pytest.fixture
def opened(tmp_path, mixed_frame):
    path = tmp_path / "mixed.csv"
    mixed_frame.write_csv(path)
    recorder = Recorder()
    router, jobs = build_router(recorder)
    dataset_id = router.dispatch("dataset.open", {"path": str(path)})["dataset_id"]
    yield router, jobs, recorder, dataset_id
    jobs.shutdown()


def finished(jobs, job_id):
    for _ in range(300):
        status = jobs.status(job_id)
        if status["state"] in {"completed", "failed", "cancelled"}:
            return status
        time.sleep(0.01)
    raise AssertionError("profile job did not finish")


def test_profile_returns_the_documented_shape_and_progress(opened):
    router, jobs, recorder, dataset_id = opened

    ack = router.dispatch("dataset.profile", {"dataset_id": dataset_id, "extra": 1})
    status = finished(jobs, ack["job_id"])

    result = status["result"]
    assert status["state"] == "completed"
    assert set(result) == PROFILE_KEYS
    assert all(set(column) == COLUMN_KEYS for column in result["columns"])
    history = router.dispatch("dataset.history", {"dataset_id": dataset_id})
    assert result["data_version"] == history["data_version"]
    assert result["history_id"] == history["history_id"]
    messages = [
        event["message"]
        for event in recorder.events
        if event["event"] == "job.progress" and event["job_id"] == ack["job_id"]
    ]
    assert {"Detecting types", "Finding duplicates"} <= set(messages)


@pytest.mark.parametrize("params", [{}, {"dataset_id": ""}, {"dataset_id": 3}])
def test_profile_rejects_a_missing_dataset_id(opened, params):
    router = opened[0]
    with pytest.raises(RequestError):
        router.dispatch("dataset.profile", params)
