import time

import pytest

from forma_engine.bootstrap import build_router
from forma_engine.domain.errors import ProfileStaleError, RequestError

METHODS = {
    "profile.column_detail": ("column_detail", {"column": "x"}),
    "profile.rows": ("rows", {"filter": {"kind": "problems", "column": None}}),
    "profile.distribution": ("distribution", {"column": "x", "bins": 20}),
    "profile.duplicates": ("duplicates", {"columns": ["email"]}),
    "profile.patterns": ("patterns", {}),
    "profile.anomalies": ("anomalies", {}),
    "profile.suggestions": ("suggestions", {}),
}


def finished(jobs, job_id):
    for _ in range(300):
        status = jobs.status(job_id)
        if status["state"] in {"completed", "failed", "cancelled"}:
            return status
        time.sleep(0.01)
    raise AssertionError("job did not finish")


@pytest.fixture
def opened(write_csv, tools_frame):
    router, jobs = build_router()
    path = write_csv(tools_frame, "tools.csv")
    dataset_id = router.dispatch("dataset.open", {"path": str(path)})["dataset_id"]
    version = router.datasets.data_version(dataset_id)
    yield router, jobs, {"dataset_id": dataset_id, "data_version": version}
    jobs.shutdown()


@pytest.mark.parametrize("method", METHODS)
def test_each_tool_method_runs_its_tool_as_a_job(opened, method):
    router, jobs, base = opened
    tool, params = METHODS[method]
    calls = []

    def fake(context, received):
        calls.append(received)
        return {"echo": tool}

    router.profile_tools.tools[tool] = fake
    ack = router.dispatch(method, base | params)
    status = finished(jobs, ack["job_id"])

    assert status["state"] == "completed"
    assert status["kind"].startswith("profile_")
    assert status["result"]["echo"] == tool
    assert status["result"]["data_version"] == base["data_version"]
    assert calls[0] == params | ({"offset": 0, "limit": 100} if tool == "rows" else {})


@pytest.mark.parametrize("method", METHODS)
def test_a_tool_that_is_not_built_yet_is_refused(opened, method):
    router, _, base = opened
    router.profile_tools.tools.pop(METHODS[method][0], None)
    with pytest.raises(RequestError):
        router.dispatch(method, base | METHODS[method][1])


def test_stale_versions_are_refused(opened):
    router, _, base = opened
    router.profile_tools.tools["patterns"] = lambda context, params: {}
    with pytest.raises(ProfileStaleError):
        router.dispatch("profile.patterns", base | {"data_version": "older"})


@pytest.mark.parametrize(
    "method, params",
    [
        ("profile.patterns", {"data_version": None}),
        ("profile.column_detail", {"column": "missing"}),
        ("profile.column_detail", {}),
        ("profile.distribution", {"column": "x", "bins": 25}),
        ("profile.distribution", {"column": "x", "bins": True}),
        ("profile.duplicates", {"columns": []}),
        ("profile.duplicates", {"columns": ["email", "email"]}),
        ("profile.duplicates", {"columns": ["nope"]}),
        ("profile.rows", {"filter": {"kind": "everything"}}),
        ("profile.rows", {"filter": {"kind": "outliers", "column": None}}),
        ("profile.rows", {"filter": {"kind": "problems", "column": "nope"}}),
        ("profile.rows", {"filter": {"kind": "problems"}, "limit": 101}),
        ("profile.rows", {"filter": {"kind": "problems"}, "limit": 0}),
        ("profile.rows", {"filter": {"kind": "problems"}, "offset": -1}),
        ("profile.rows", {"filter": {"kind": "problems"}, "offset": "5"}),
    ],
)
def test_bad_parameters_are_refused(opened, method, params):
    router, _, base = opened
    for tool, _ in METHODS.values():
        router.profile_tools.tools[tool] = lambda context, received: {}
    with pytest.raises(RequestError):
        router.dispatch(method, base | params)
