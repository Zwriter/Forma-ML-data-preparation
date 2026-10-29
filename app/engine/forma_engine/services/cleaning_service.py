from forma_engine.domain.entities import Dataset
from forma_engine.domain.errors import CancelledError, InvalidTransformationError
from forma_engine.io.readers import schema_for, row_count
from forma_engine.services.dataset_service import DatasetService
from forma_engine.transformations.executor import execute


class CleaningService:
    def __init__(self, datasets: DatasetService, jobs=None):
        self.datasets, self.jobs = datasets, jobs

    def preview(self, dataset_id, operation):
        source = self.datasets.frame(dataset_id)
        result = execute(source, [operation])
        try:
            before = source.limit(100).collect().to_dicts()
            after = result.limit(100).collect().to_dicts()
        except Exception as exc:
            raise InvalidTransformationError(
                "The transformation could not produce a valid preview."
            ) from exc
        return {
            "before": before,
            "after": after,
            "columns": schema_for(result),
            "validation": {"valid": True},
        }

    def apply(self, dataset_id, operations, cancelled):
        source_dataset = self.datasets.get(dataset_id)
        source = self.datasets.frame(dataset_id)
        result = execute(source, operations, cancelled)
        try:
            rows = row_count(result)
        except Exception as exc:
            raise InvalidTransformationError(
                "The transformation result could not be materialized; "
                "the last valid dataset remains available."
            ) from exc
        dataset = Dataset(
            source_dataset.source_path,
            source_dataset.format,
            schema_for(result),
            rows,
        )
        if cancelled():
            raise CancelledError("Cleaning was cancelled.")
        history = self.datasets.register_derived(
            dataset_id, dataset, result, {"type": "cleaning", "operations": operations}
        )
        return {"dataset": dataset.to_dict(), "history": history, "_committed": True}

    def submit(self, dataset_id, operations):
        if self.jobs is None:
            raise RuntimeError("Cleaning job manager is not configured")
        return self.jobs.submit(
            "clean",
            lambda cancel: self.apply(dataset_id, operations, cancel),
        )
