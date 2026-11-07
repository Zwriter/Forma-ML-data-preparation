from forma_engine.services.dataset_service import DatasetService
from forma_engine.services.profile_service import ProfileService


class Token:
    def __call__(self):
        return False

    def report(self, fraction, message):
        pass


class InlineJobs:
    """Runs the work at once, like JobManager would on a worker thread."""

    def submit(self, kind, work, abandon_on_cancel=False):
        self.kind, self.abandon = kind, abandon_on_cancel
        self.result = work(Token())
        return {"job_id": "j1", "state": "completed"}


def opened(tmp_path, mixed_frame):
    path = tmp_path / "mixed.csv"
    mixed_frame.write_csv(path)
    datasets = DatasetService()
    return datasets, datasets.open(str(path))["dataset_id"]


def test_submit_profiles_the_current_version_and_keeps_the_latest(
    tmp_path, mixed_frame
):
    datasets, dataset_id = opened(tmp_path, mixed_frame)
    jobs = InlineJobs()
    service = ProfileService(datasets, jobs)

    ack = service.submit(dataset_id)

    history_id = datasets.history_id(dataset_id)
    assert ack["job_id"] == "j1" and jobs.kind == "profile"
    assert jobs.abandon  # profiling writes nothing, so a cancel can end it at once
    assert jobs.result["history_id"] == history_id
    assert jobs.result["data_version"] == datasets.data_version(dataset_id)
    assert jobs.result["row_count"] == 63
    assert service.latest(history_id) is jobs.result
    assert service.latest("unknown") is None


def test_report_renders_the_latest_profile_to_html(tmp_path, mixed_frame):
    import pytest
    from forma_engine.domain.errors import ProfileStaleError, RequestError

    datasets, dataset_id = opened(tmp_path, mixed_frame)
    jobs = InlineJobs()
    service = ProfileService(datasets, jobs)
    version = datasets.data_version(dataset_id)
    target = tmp_path / "profile.html"

    with pytest.raises(ProfileStaleError):  # nothing profiled yet
        service.submit_report(dataset_id, version, str(target), None, None, False)

    service.submit(dataset_id)
    service.submit_report(dataset_id, version, str(target), "price", "name", False)
    assert jobs.kind == "profile_report" and not jobs.abandon  # it writes a file
    assert jobs.result["bytes"] == target.stat().st_size
    assert "Distribution of price" in target.read_text(encoding="utf-8")

    with pytest.raises(ProfileStaleError):
        service.submit_report(dataset_id, "older", str(target), None, None, True)
    with pytest.raises(RequestError):
        service.submit_report(dataset_id, version, str(target), "name", None, True)
    with pytest.raises(RequestError):
        service.submit_report(
            dataset_id, version, str(tmp_path / "x.txt"), None, None, True
        )
