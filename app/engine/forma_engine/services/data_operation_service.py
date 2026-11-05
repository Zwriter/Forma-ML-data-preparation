from forma_engine.domain.entities import Dataset
from forma_engine.domain.errors import CancelledError, InvalidTransformationError
from forma_engine.io.readers import row_count, schema_for
from forma_engine.services.dataset_service import DatasetService
from forma_engine.transformations.executor import execute
from forma_engine.transformations.validators import validate

RESHAPES = {"group_by", "pivot", "unpivot"}


class DataOperationService:
    def __init__(self, datasets: DatasetService, jobs=None):
        self.datasets, self.jobs = datasets, jobs

    def apply(self, dataset_id, operation, cancelled):
        source_dataset = self.datasets.get(dataset_id)
        source = self.datasets.frame(dataset_id)
        if operation["type"] == "sort_rows":
            return self._sort(dataset_id, source_dataset, source, operation)
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
        view = [] if operation["type"] in RESHAPES else None
        history = self.datasets.register_derived(
            dataset_id, dataset, result, operation, view
        )
        return {"dataset": dataset.to_dict(), "history": history, "_committed": True}

    def _sort(self, dataset_id, source_dataset, source, operation):
        """Sorting changes only the view: the new entry reuses the same frame."""
        schema = source.collect_schema()
        validate(operation, schema.names(), schema)
        dataset = Dataset(
            source_dataset.source_path,
            source_dataset.format,
            source_dataset.schema,
            source_dataset.rows,
        )
        keys = operation["parameters"]["keys"]
        history = self.datasets.register_derived(
            dataset_id, dataset, source, operation, keys
        )
        return {"dataset": dataset.to_dict(), "history": history, "_committed": True}

    def submit(self, dataset_id, operation):
        if self.jobs is None:
            raise RuntimeError("Data operation job manager is not configured")
        return self.jobs.submit(
            operation["type"],
            lambda cancelled: self.apply(dataset_id, operation, cancelled),
        )
