import time

import pytest

from forma_engine.bootstrap import build_router
from forma_engine.domain.errors import RequestError

CITY_DESC = [{"column": "city", "direction": "descending", "nulls": "last"}]


def finish(jobs, job_id):
    for _ in range(300):
        status = jobs.status(job_id)
        if status["state"] in {"completed", "failed", "cancelled"}:
            return status
        time.sleep(0.01)
    raise AssertionError("Job did not finish")


@pytest.fixture
def opened(tmp_path):
    path = tmp_path / "people.csv"
    path.write_text("id,city\n1,b\n2,z\n3,a\n", encoding="utf-8")
    router, jobs = build_router()
    dataset = router.dispatch("dataset.open", {"path": str(path)})
    yield router, jobs, dataset["dataset_id"]
    jobs.shutdown()


def sort(router, jobs, dataset_id, keys):
    job = router.dispatch(
        "data.apply",
        {
            "dataset_id": dataset_id,
            "operation": {"type": "sort_rows", "parameters": {"keys": keys}},
        },
    )
    status = finish(jobs, job["job_id"])
    assert status["state"] == "completed", status
    return status["result"]


def test_preview_returns_rows_in_view_order_with_the_view(opened):
    router, jobs, dataset_id = opened
    sorted_id = sort(router, jobs, dataset_id, CITY_DESC)["dataset"]["dataset_id"]

    preview = router.dispatch("dataset.preview", {"dataset_id": sorted_id})

    assert [row["id"] for row in preview["records"]] == [2, 1, 3]
    assert preview["view"] == CITY_DESC


def test_cleaning_preview_returns_the_view(opened):
    router, jobs, dataset_id = opened
    sorted_id = sort(router, jobs, dataset_id, CITY_DESC)["dataset"]["dataset_id"]
    rename = {"type": "rename_columns", "parameters": {"mapping": {"city": "town"}}}

    preview = router.dispatch(
        "cleaning.preview", {"dataset_id": sorted_id, "operations": [rename]}
    )

    assert [row["values"]["id"] for row in preview["rows"]] == [2, 1, 3]
    assert preview["view"] == [{**CITY_DESC[0], "column": "town"}]


def test_sort_with_empty_keys_clears_the_view(opened):
    router, jobs, dataset_id = opened
    sorted_id = sort(router, jobs, dataset_id, CITY_DESC)["dataset"]["dataset_id"]

    result = sort(router, jobs, sorted_id, [])

    cleared = result["dataset"]["dataset_id"]
    preview = router.dispatch("dataset.preview", {"dataset_id": cleared})
    assert [row["id"] for row in preview["records"]] == [1, 2, 3]
    assert preview["view"] == []
    assert result["history"]["is_dirty"] is True


def test_open_applies_a_remembered_view_as_the_saved_state(tmp_path):
    path = tmp_path / "people.csv"
    path.write_text("id,city\n1,b\n2,z\n3,a\n", encoding="utf-8")
    gone = {"column": "gone", "direction": "ascending", "nulls": "last"}
    router, jobs = build_router()
    try:
        opened = router.dispatch(
            "dataset.open", {"path": str(path), "view": [gone, *CITY_DESC]}
        )
        preview = router.dispatch(
            "dataset.preview", {"dataset_id": opened["dataset_id"]}
        )
        history = router.dispatch(
            "dataset.history", {"dataset_id": opened["dataset_id"]}
        )
    finally:
        jobs.shutdown()

    assert opened["view"] == CITY_DESC
    assert opened["dropped_columns"] == ["gone"]
    assert [row["id"] for row in preview["records"]] == [2, 1, 3]
    assert history["is_dirty"] is False


def test_open_without_a_view_reports_stored_order(tmp_path):
    path = tmp_path / "people.csv"
    path.write_text("id\n1\n", encoding="utf-8")
    router, jobs = build_router()
    try:
        opened = router.dispatch("dataset.open", {"path": str(path)})
    finally:
        jobs.shutdown()

    assert opened["view"] == []
    assert opened["dropped_columns"] == []


@pytest.mark.parametrize(
    "view",
    ["city", [None], [{"column": "city", "direction": "up", "nulls": "last"}]],
)
def test_open_rejects_a_malformed_view(tmp_path, view):
    path = tmp_path / "people.csv"
    path.write_text("city\nb\n", encoding="utf-8")
    router, jobs = build_router()
    try:
        with pytest.raises(RequestError):
            router.dispatch("dataset.open", {"path": str(path), "view": view})
    finally:
        jobs.shutdown()
