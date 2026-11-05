from forma_engine.profiling.statistics import profile


class ProfileService:
    def __init__(self, datasets, jobs):
        self.datasets, self.jobs = datasets, jobs
        self._latest: dict[str, dict] = {}  # last finished profile per history

    def latest(self, history_id: str) -> dict | None:
        return self._latest.get(history_id)

    def submit(self, dataset_id: str):
        frame = self.datasets.frame(dataset_id)
        history_id = self.datasets.history_id(dataset_id)
        data_version = self.datasets.data_version(dataset_id)

        def work(token):
            result = profile(frame, dataset_id, history_id, data_version, token)
            self._latest[history_id] = result
            return result

        return self.jobs.submit("profile", work)
