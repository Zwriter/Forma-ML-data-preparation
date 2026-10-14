from forma_engine.domain.errors import RequestError
from forma_engine.ipc.dataset_handlers import DatasetHandlers
from forma_engine.ipc.profile_handlers import ProfileHandlers
from forma_engine.ipc.cleaning_handlers import CleaningHandlers
from forma_engine.ipc.export_handlers import ExportHandlers
from forma_engine.ipc.job_handlers import JobHandlers

class Router:
    """Dispatch namespaced IPC methods to focused handler classes."""
    def __init__(self, datasets, cleaning, profile_service, jobs, exports):
        self.datasets, self.cleaning, self.jobs, self.exports = datasets, cleaning, jobs, exports
        dataset = DatasetHandlers(datasets); profile = ProfileHandlers(datasets, profile_service)
        clean = CleaningHandlers(datasets, cleaning); export = ExportHandlers(datasets, jobs, exports)
        job = JobHandlers(jobs)
        self.handlers = {
            "dataset.open": dataset.open, "dataset.preview": dataset.preview,
            "dataset.profile": profile.profile, "cleaning.preview": clean.preview,
            "cleaning.apply": clean.apply, "export.csv": lambda p: export.export(p, "csv"),
            "export.parquet": lambda p: export.export(p, "parquet"),
            "job.status": job.status, "job.cancel": job.cancel,
        }

    def dispatch(self, method: str, params: dict):
        handler = self.handlers.get(method)
        if not handler: raise RequestError("Unknown operation.")
        if not isinstance(params, dict): raise RequestError("params must be an object.")
        return handler(params)
