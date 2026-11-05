from forma_engine.domain.errors import RequestError
from forma_engine.ipc.dataset_handlers import DatasetHandlers
from forma_engine.ipc.profile_handlers import ProfileHandlers
from forma_engine.ipc.cleaning_handlers import CleaningHandlers
from forma_engine.ipc.export_handlers import ExportHandlers
from forma_engine.ipc.job_handlers import JobHandlers
from forma_engine.ipc.data_operation_handlers import DataOperationHandlers


class Router:
    """Dispatch namespaced IPC methods to focused handler classes."""

    def __init__(
        self,
        datasets,
        cleaning,
        profile_service,
        jobs,
        exports,
        saves=None,
        data_operations=None,
    ):
        self.datasets, self.cleaning, self.jobs, self.exports = (
            datasets,
            cleaning,
            jobs,
            exports,
        )
        dataset = DatasetHandlers(datasets, jobs, saves)
        profile = ProfileHandlers(datasets, profile_service)
        clean = CleaningHandlers(datasets, cleaning)
        export = ExportHandlers(datasets, jobs, exports)
        job = JobHandlers(jobs)
        data_operation = DataOperationHandlers(datasets, data_operations)
        self.handlers = {
            "dataset.open": dataset.open,
            "dataset.preview": dataset.preview,
            "dataset.history": dataset.history,
            "dataset.undo": dataset.undo,
            "dataset.redo": dataset.redo,
            "dataset.save": dataset.save,
            "settings.history_limit": self._set_history_limit,
            "data.apply": data_operation.apply,
            "dataset.profile": profile.profile,
            "cleaning.preview": clean.preview,
            "cleaning.validate": clean.validate,
            "cleaning.apply": clean.apply,
            "export.csv": lambda p: export.export(p, "csv"),
            "export.parquet": lambda p: export.export(p, "parquet"),
            "job.status": job.status,
            "job.cancel": job.cancel,
        }

    def dispatch(self, method: str, params: dict):
        handler = self.handlers.get(method)
        if not handler:
            raise RequestError("Unknown operation.")
        if not isinstance(params, dict):
            raise RequestError("params must be an object.")
        return handler(params)

    def _set_history_limit(self, params: dict):
        if "max_actions" not in params:
            raise RequestError("Provide max_actions.")
        limit = self.datasets.history_service.set_max_actions(params["max_actions"])
        return {"max_actions": limit}
