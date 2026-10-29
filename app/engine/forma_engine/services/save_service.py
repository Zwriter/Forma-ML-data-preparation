from pathlib import Path

from forma_engine.domain.errors import (
    CancelledError,
    FileAccessError,
    SaveError,
    SaveRequiredError,
)
from forma_engine.io.writers import write_safe


def _confirm_overwrite(target: Path, destination, force_overwrite: bool) -> None:
    """Refuse to replace an existing file unless the user confirmed it."""
    if target.exists() and not force_overwrite:
        kind = "destination" if destination else "source"
        raise SaveRequiredError(
            f"This will replace the {kind} file. Confirm replacement to continue."
        )


class SaveService:
    def __init__(self, datasets):
        self.datasets = datasets

    def save(self, dataset_id, force_overwrite, cancelled, destination=None):
        entry = self.datasets.history_service.current(dataset_id)
        return self.save_entry(
            dataset_id, entry, force_overwrite, cancelled, destination
        )

    def save_entry(
        self, history_dataset_id, entry, force_overwrite, cancelled, destination=None
    ):
        dataset, frame = entry.dataset, entry.frame
        target_path = destination or dataset.source_path
        target = Path(target_path).expanduser()
        _confirm_overwrite(target, destination, force_overwrite)
        if cancelled():
            raise CancelledError("Save was cancelled.")
        try:
            result = write_safe(
                frame,
                str(target),
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

    def submit(self, jobs, dataset_id, force_overwrite, destination=None):
        self.datasets.get(dataset_id)
        if not isinstance(force_overwrite, bool):
            raise ValueError("force_overwrite must be a boolean")
        dataset = self.datasets.get(dataset_id)
        target = Path(destination or dataset.source_path).expanduser()
        _confirm_overwrite(target, destination, force_overwrite)
        entry = self.datasets.history_service.current(dataset_id)
        return jobs.submit(
            "save",
            lambda cancelled: self.save_entry(
                dataset_id, entry, force_overwrite, cancelled, destination
            ),
        )
