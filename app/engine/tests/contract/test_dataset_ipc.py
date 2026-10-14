import io
import json
import pytest
from forma_engine.bootstrap import build_router
from forma_engine.ipc.server import serve
from forma_engine.jobs.events import EventPublisher
from forma_engine.domain.errors import DatasetNotFoundError, RequestError


def test_open_and_preview_correlate_and_cap_limit(tmp_path):
    source = tmp_path / "sample.csv"
    source.write_text("value\n" + "1\n" * 520)
    router, jobs = build_router(EventPublisher(io.StringIO()))
    requests = [
        {"id": "open-1", "method": "dataset.open", "params": {"path": str(source)}},
    ]
    output = io.StringIO()
    serve(router, io.StringIO("\n".join(map(json.dumps, requests)) + "\n"), output)
    opened = json.loads(output.getvalue().splitlines()[0])["result"]
    response = router.dispatch(
        "dataset.preview",
        {"dataset_id": opened["dataset_id"], "offset": 0, "limit": 999},
    )
    assert len(response["records"]) == 500
    assert response["limit"] == 500
    jobs.shutdown()


def test_preview_rejects_invalid_window_and_unknown_dataset():
    router, jobs = build_router()
    with pytest.raises(RequestError):
        router.dispatch(
            "dataset.preview", {"dataset_id": "d", "offset": -1, "limit": 10}
        )
    with pytest.raises(DatasetNotFoundError):
        router.dispatch(
            "dataset.preview", {"dataset_id": "missing", "offset": 0, "limit": 10}
        )
    jobs.shutdown()


def test_open_requires_path_parameter():
    router, jobs = build_router()
    with pytest.raises(RequestError):
        router.dispatch("dataset.open", {})
    jobs.shutdown()
