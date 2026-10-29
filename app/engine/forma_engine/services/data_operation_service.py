from forma_engine.domain.entities import Dataset
from forma_engine.domain.errors import CancelledError, InvalidTransformationError
from forma_engine.io.readers import row_count, schema_for
from forma_engine.services.dataset_service import DatasetService
from forma_engine.transformations.executor import execute


class DataOperationService:
    def __init__(self, datasets: DatasetService, jobs=None):
        self.datasets, self.jobs = datasets, jobs

    def apply(self, dataset_id, operation, cancelled):
        source_dataset = self.datasets.get(dataset_id)
        source = self.datasets.frame(dataset_id)
        result = execute(source, [operation], cancelled)
        try:
            rows = row_count(result)
        except Exception as exc:
            raise InvalidTransformationError(
                "The operation result could not be materialized; "
                "the last valid dataset remains active."
            ) from exc
        if cancelled():
            raise CancelledError("Data operation was cancelled.")
        dataset = Dataset(
            source_dataset.source_path,
            source_dataset.format,
            schema_for(result),
            rows,
        )
        history = self.datasets.register_derived(dataset_id, dataset, result, operation)
        return {"dataset": dataset.to_dict(), "history": history, "_committed": True}

    def submit(self, dataset_id, operation):
        if self.jobs is None:
            raise RuntimeError("Data operation job manager is not configured")
        return self.jobs.submit(
            operation["type"],
            lambda cancelled: self.apply(dataset_id, operation, cancelled),
        )
