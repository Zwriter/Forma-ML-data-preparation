import pytest
import time

from forma_engine.bootstrap import build_router
from forma_engine.domain.entities import Dataset
from forma_engine.domain.errors import FormaError


@pytest.fixture
def router_and_jobs():
    router, jobs = build_router()
    yield router, jobs
    jobs.shutdown()


def test_history_returns_current_cursor_metadata(router_and_jobs, tmp_path):
    router, _ = router_and_jobs
    source = tmp_path / "sample.csv"
    source.write_text("value\n1\n", encoding="utf-8")
    opened = router.dispatch("dataset.open", {"path": str(source)})

    result = router.dispatch("dataset.history", {"dataset_id": opened["dataset_id"]})

    assert result["dataset_id"] == opened["dataset_id"]
    assert result["is_dirty"] is False
    assert result["can_undo"] is False
    assert result["can_redo"] is False


def test_history_limit_setting_updates_engine_limit(router_and_jobs):
    router, _ = router_and_jobs

    result = router.dispatch("settings.history_limit", {"max_actions": 3})

    assert result == {"max_actions": 3}
    assert router.datasets.history_service.max_actions == 3


def test_open_applies_persisted_history_limit(router_and_jobs, tmp_path):
    router, _ = router_and_jobs
    source = tmp_path / "sample.csv"
    source.write_text("value\n1\n", encoding="utf-8")

    router.dispatch(
        "dataset.open", {"path": str(source), "history_limit": 7}
    )

    assert router.datasets.history_service.max_actions == 7


@pytest.mark.parametrize(
    "method,params",
    [
        ("dataset.history", {}),
        ("dataset.undo", {"dataset_id": ""}),
        ("dataset.redo", {"dataset_id": 3}),
        ("dataset.save", {"dataset_id": "d1", "force_overwrite": "yes"}),
        ("dataset.save", {"dataset_id": "d1", "destination": ""}),
        ("data.apply", {"dataset_id": "d1", "operation": []}),
        ("settings.history_limit", {"max_actions": 101}),
    ],
)
def test_new_methods_reject_invalid_request_shapes(router_and_jobs, method, params):
    router, _ = router_and_jobs
    with pytest.raises(FormaError):
        router.dispatch(method, params)


def test_undo_redo_and_save_return_job_acknowledgements(router_and_jobs, tmp_path):
    router, _ = router_and_jobs
    source = tmp_path / "sample.csv"
    source.write_text("value\n1\n", encoding="utf-8")
    opened = router.dispatch("dataset.open", {"path": str(source)})
    derived = Dataset(opened["source_path"], "csv", opened["schema"], opened["rows"])
    router.datasets.register_derived(
        opened["dataset_id"],
        derived,
        router.datasets.frame(opened["dataset_id"]),
        {"type": "test"},
    )

    undo = router.dispatch("dataset.undo", {"dataset_id": derived.dataset_id})
    assert undo["state"] in {"pending", "running"}
    for _ in range(100):
        if router.jobs.status(undo["job_id"])["state"] == "completed":
            break
        time.sleep(0.01)

    for method, params in (
        ("dataset.redo", {"dataset_id": opened["dataset_id"]}),
        ("dataset.save", {"dataset_id": derived.dataset_id, "force_overwrite": True}),
    ):
        result = router.dispatch(method, params)
        assert result["state"] in {"pending", "running"}
        assert result["job_id"]
