from pathlib import Path

from forma_engine.domain.errors import (
    CancelledError,
    FileAccessError,
    ProfileStaleError,
    RequestError,
)
from forma_engine.io.writers import write_safe
from forma_engine.profiling.rejects import rejected_rows
from forma_engine.profiling.type_detection import detect_types


class InvalidRowsService:
    """Writes the rows with invalid values, plus a reject reason, to a new file."""

    def __init__(self, datasets):
        self.datasets = datasets

    def _check(self, dataset_id, data_version, column, destination):
        dataset = self.datasets.get(dataset_id)
        if self.datasets.data_version(dataset_id) != data_version:
            raise ProfileStaleError(
                "The profile is out of date. Refresh it and try again."
            )
        names = self.datasets.frame(dataset_id).collect_schema().names()
        if column is not None and column not in names:
            raise RequestError("Choose an existing column.")
        target = Path(destination).expanduser().resolve()
        if target == Path(dataset.source_path).expanduser().resolve():
            raise FileAccessError(
                "Choose a different file; the open source file cannot be replaced."
            )

    def export(
        self, dataset_id, data_version, column, destination, fmt, overwrite, cancelled
    ):
        self._check(dataset_id, data_version, column, destination)
        frame = self.datasets.frame(dataset_id)
        rows = rejected_rows(frame, detect_types(frame), column)
        if cancelled():
            raise CancelledError("Export was cancelled.")
        if rows.head(1).collect().is_empty():
            raise RequestError("There are no invalid values to export.")
        try:
            result = write_safe(rows, destination, fmt, overwrite, cancelled)
        except InterruptedError as exc:
            raise CancelledError("Export was cancelled.") from exc
        return result | {"reason_column": rows.collect_schema().names()[-1]}

    def submit(
        self, jobs, dataset_id, data_version, column, destination, fmt, overwrite
    ):
        # Fail fast on requests that can never succeed, before starting a job.
        self._check(dataset_id, data_version, column, destination)
        return jobs.submit(
            "export_invalid",
            lambda cancel: self.export(
                dataset_id, data_version, column, destination, fmt, overwrite, cancel
            ),
        )
