from forma_engine.io.writers import write_safe
from forma_engine.domain.errors import CancelledError


class ExportService:
    def __init__(self, datasets):
        self.datasets = datasets

    def export(self, dataset_id, destination, fmt, force_overwrite, cancelled):
        if cancelled():
            raise CancelledError("Export was cancelled.")
        try:
            return write_safe(
                self.datasets.frame(dataset_id),
                destination,
                fmt,
                force_overwrite,
                cancelled,
            )
        except InterruptedError as exc:
            raise CancelledError("Export was cancelled.") from exc

    def submit(self, jobs, dataset_id, destination, fmt, force_overwrite):
        self.datasets.get(dataset_id)
        return jobs.submit(
            "export",
            lambda cancel: self.export(
                dataset_id, destination, fmt, force_overwrite, cancel
            ),
        )
