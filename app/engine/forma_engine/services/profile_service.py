from forma_engine.profiling.statistics import profile


class ProfileService:
    def __init__(self, datasets, jobs):
        self.datasets, self.jobs = datasets, jobs

    def submit(self, dataset_id: str, frequencies: bool = True):
        self.datasets.get(dataset_id)
        return self.jobs.submit(
            "profile",
            lambda cancel: profile(
                self.datasets.frame(dataset_id), dataset_id, frequencies, cancel
            ),
        )
