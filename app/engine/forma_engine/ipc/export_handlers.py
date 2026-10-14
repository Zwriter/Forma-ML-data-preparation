from forma_engine.domain.errors import RequestError

class ExportHandlers:
    def __init__(self, datasets, jobs, exports): self.datasets, self.jobs, self.exports = datasets, jobs, exports
    def export(self, params, fmt):
        dataset_id, destination = params.get("dataset_id"), params.get("destination")
        if not isinstance(dataset_id, str) or not dataset_id: raise RequestError("Provide a dataset_id.")
        if not isinstance(destination, str) or not destination.strip(): raise RequestError("Choose an export destination.")
        overwrite = params.get("force_overwrite", False)
        if not isinstance(overwrite, bool): raise RequestError("force_overwrite must be a boolean.")
        self.datasets.get(dataset_id)
        return self.exports.submit(self.jobs, dataset_id, destination, fmt, overwrite)
