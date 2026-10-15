from forma_engine.domain.errors import RequestError


class ProfileHandlers:
    def __init__(self, datasets, service):
        self.datasets, self.service = datasets, service

    def profile(self, params):
        dataset_id = params.get("dataset_id")
        if not isinstance(dataset_id, str) or not dataset_id:
            raise RequestError("Provide a dataset_id.")
        self.datasets.get(dataset_id)
        frequencies = params.get("frequencies", True)
        if not isinstance(frequencies, bool):
            raise RequestError("frequencies must be a boolean.")
        return self.service.submit(dataset_id, frequencies)
