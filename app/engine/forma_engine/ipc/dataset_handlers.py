from forma_engine.domain.errors import CancelledError, HistoryBoundaryError, RequestError


class DatasetHandlers:
    def __init__(self, datasets, jobs=None, saves=None):
        self.datasets, self.jobs, self.saves = datasets, jobs, saves

    def open(self, params):
        path = params.get("path")
        if not isinstance(path, str) or not path.strip():
            raise RequestError("Provide a local file path.")
        return self.datasets.open(path)

    def preview(self, params):
        self._dataset_id(params)
        columns = params.get("columns")
        if columns is not None and (
            not isinstance(columns, list)
            or any(not isinstance(item, str) for item in columns)
        ):
            raise RequestError("columns must be a list of column names.")
        return self.datasets.preview(
            params["dataset_id"],
            params.get("offset", 0),
            params.get("limit", 100),
            columns,
        )

    def history(self, params):
        dataset_id = self._dataset_id(params)
        return self.datasets.history(dataset_id)

    def undo(self, params):
        return self._move(params, "undo")

    def redo(self, params):
        return self._move(params, "redo")

    def save(self, params):
        dataset_id = self._dataset_id(params)
        overwrite = params.get("force_overwrite", False)
        if not isinstance(overwrite, bool):
            raise RequestError("force_overwrite must be a boolean.")
        if self.saves is None or self.jobs is None:
            raise RequestError("Save is not available.")
        return self.saves.submit(self.jobs, dataset_id, overwrite)

    def _move(self, params, direction):
        dataset_id = self._dataset_id(params)
        history = self.datasets.history(dataset_id)
        available = history["can_undo"] if direction == "undo" else history["can_redo"]
        if not available:
            raise HistoryBoundaryError(f"Cannot {direction}: no history state exists.")
        if self.jobs is None:
            raise RequestError("History actions are not available.")
        return self.jobs.submit(
            direction,
            lambda cancelled: self._move_work(dataset_id, direction, cancelled),
        )

    def _move_work(self, dataset_id, direction, cancelled):
        if cancelled():
            raise CancelledError(f"{direction.title()} was cancelled.")
        result = self.datasets.move_history(dataset_id, direction)
        result["_committed"] = True
        return result

    def _dataset_id(self, params):
        if not isinstance(params.get("dataset_id"), str) or not params["dataset_id"]:
            raise RequestError("Provide a dataset_id.")
