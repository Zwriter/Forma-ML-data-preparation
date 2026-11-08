import pytest

from forma_engine.domain.errors import CancelledError, ProfileStaleError, RequestError
from forma_engine.services.dataset_service import DatasetService
from forma_engine.services.profile_tools_service import ProfileToolsService


class Token:
    def __init__(self, cancelled=False):
        self.cancelled = cancelled

    def __call__(self):
        return self.cancelled

    def report(self, fraction, message):
        pass


class InlineJobs:
    def __init__(self, token=None):
        self.token = token or Token()

    def submit(self, kind, work, abandon_on_cancel=False):
        self.kind, self.abandon = kind, abandon_on_cancel
        self.result = work(self.token)
        return {"job_id": "j1", "state": "pending"}


def opened(tmp_path, tools_frame):
    path = tmp_path / "tools.csv"
    tools_frame.write_csv(path)
    datasets = DatasetService()
    return datasets, datasets.open(str(path))["dataset_id"]


def service_with(datasets, jobs, tools, latest=lambda history_id: None):
    return ProfileToolsService(datasets, jobs, tools, latest)


def test_runs_the_tool_on_the_current_frame_as_an_abandonable_job(
    tmp_path, tools_frame
):
    datasets, dataset_id = opened(tmp_path, tools_frame)
    jobs = InlineJobs()
    seen = {}

    def duplicates(context, params):
        seen["rows"] = context.frame.collect().height
        seen["token"] = context.token
        return {"columns": params["columns"]}

    service = service_with(datasets, jobs, {"duplicates": duplicates})
    version = datasets.data_version(dataset_id)
    ack = service.submit("duplicates", dataset_id, version, {"columns": ["email"]})

    assert ack["job_id"] == "j1"
    assert jobs.kind == "profile_duplicates" and jobs.abandon
    assert seen == {"rows": 100, "token": jobs.token}
    assert jobs.result["columns"] == ["email"]
    assert jobs.result["dataset_id"] == dataset_id
    assert jobs.result["data_version"] == version
    assert jobs.result["computed_at"].endswith("Z")


def test_tools_see_the_latest_profile_for_the_history(tmp_path, tools_frame):
    datasets, dataset_id = opened(tmp_path, tools_frame)
    history_id = datasets.history_id(dataset_id)
    profiles = {history_id: {"row_count": 100}}
    jobs = InlineJobs()
    service = service_with(
        datasets,
        jobs,
        {"suggestions": lambda context, params: {"rows": context.profile["row_count"]}},
        profiles.get,
    )

    service.submit("suggestions", dataset_id, datasets.data_version(dataset_id), {})

    assert jobs.kind == "profile_suggestions" and jobs.result["rows"] == 100


def test_an_old_data_version_is_refused(tmp_path, tools_frame):
    datasets, dataset_id = opened(tmp_path, tools_frame)
    service = service_with(datasets, InlineJobs(), {"patterns": lambda c, p: {}})
    with pytest.raises(ProfileStaleError):
        service.submit("patterns", dataset_id, "older", {})


def test_a_tool_without_an_implementation_is_refused(tmp_path, tools_frame):
    datasets, dataset_id = opened(tmp_path, tools_frame)
    service = service_with(datasets, InlineJobs(), {})
    assert not service.has("patterns")
    with pytest.raises(RequestError):
        service.submit("patterns", dataset_id, datasets.data_version(dataset_id), {})


def test_a_cancel_during_the_tool_drops_its_result(tmp_path, tools_frame):
    datasets, dataset_id = opened(tmp_path, tools_frame)
    jobs = InlineJobs(Token(cancelled=True))
    service = service_with(datasets, jobs, {"anomalies": lambda c, p: {"columns": []}})
    with pytest.raises(CancelledError):
        service.submit("anomalies", dataset_id, datasets.data_version(dataset_id), {})
