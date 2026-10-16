from pathlib import Path

from forma_engine.domain.errors import (
    CancelledError,
    FileAccessError,
    SaveError,
    SaveRequiredError,
)
from forma_engine.io.writers import write_safe


class SaveService:
    def __init__(self, datasets):
        self.datasets = datasets

    def save(self, dataset_id, force_overwrite, cancelled):
        entry = self.datasets.history_service.current(dataset_id)
        return self.save_entry(dataset_id, entry, force_overwrite, cancelled)

    def save_entry(self, history_dataset_id, entry, force_overwrite, cancelled):
        dataset, frame = entry.dataset, entry.frame
        target = Path(dataset.source_path).expanduser()
        if target.exists() and not force_overwrite:
            raise SaveRequiredError(
                "This will replace the source file. Confirm replacement to continue."
            )
        if cancelled():
            raise CancelledError("Save was cancelled.")
        try:
            result = write_safe(
                frame,
                dataset.source_path,
                dataset.format,
                force_overwrite,
                cancelled,
            )
        except InterruptedError as exc:
            raise CancelledError("Save was cancelled.") from exc
        except SaveRequiredError:
            raise
        except FileAccessError as exc:
            raise SaveError("The current dataset could not be safely saved.") from exc
        except Exception as exc:
            raise SaveError("The current dataset could not be safely saved.") from exc
        result["history"] = self.datasets.history_service.mark_saved(
            history_dataset_id, dataset.dataset_id
        )
        result["_committed"] = True
        return result

    def submit(self, jobs, dataset_id, force_overwrite):
        self.datasets.get(dataset_id)
        if not isinstance(force_overwrite, bool):
            raise ValueError("force_overwrite must be a boolean")
        source_path = Path(self.datasets.get(dataset_id).source_path).expanduser()
        if source_path.exists() and not force_overwrite:
            raise SaveRequiredError(
                "This will replace the source file. Confirm replacement to continue."
            )
        entry = self.datasets.history_service.current(dataset_id)
        return jobs.submit(
            "save",
            lambda cancelled: self.save_entry(
                dataset_id, entry, force_overwrite, cancelled
            ),
        )
