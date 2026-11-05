from forma_engine.services.dataset_service import DatasetService
from forma_engine.services.profile_service import ProfileService


class Token:
    def __call__(self):
        return False

    def report(self, fraction, message):
        pass


class InlineJobs:
    """Runs the work at once, like JobManager would on a worker thread."""

    def submit(self, kind, work):
        self.kind, self.result = kind, work(Token())
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
    assert jobs.result["history_id"] == history_id
    assert jobs.result["data_version"] == datasets.data_version(dataset_id)
    assert jobs.result["row_count"] == 63
    assert service.latest(history_id) is jobs.result
    assert service.latest("unknown") is None
