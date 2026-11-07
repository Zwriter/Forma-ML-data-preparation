from forma_engine.core.logging import configure_logging
from forma_engine.jobs.events import EventPublisher
from forma_engine.jobs.manager import JobManager
from forma_engine.services.dataset_service import DatasetService
from forma_engine.services.cleaning_service import CleaningService
from forma_engine.services.export_service import ExportService
from forma_engine.services.profile_service import ProfileService
from forma_engine.services.invalid_rows_service import InvalidRowsService
from forma_engine.services.profile_tools_service import ProfileToolsService
from forma_engine.profiling.tools import TOOLS
from forma_engine.services.save_service import SaveService
from forma_engine.services.data_operation_service import DataOperationService
from forma_engine.ipc.router import Router
from forma_engine.ipc.server import serve


def build_router(publisher=None):
    publisher = publisher or EventPublisher()
    datasets = DatasetService()
    jobs = JobManager(publisher)
    profiles = ProfileService(datasets, jobs)
    return Router(
        datasets,
        CleaningService(datasets, jobs),
        profiles,
        jobs,
        ExportService(datasets),
        SaveService(datasets),
        DataOperationService(datasets, jobs),
        InvalidRowsService(datasets),
        # a copy, so tests that register fake tools do not leak into other routers
        ProfileToolsService(datasets, jobs, dict(TOOLS), profiles.latest),
    ), jobs


def main():
    configure_logging()
    router, jobs = build_router()
    try:
        serve(router)
    finally:
        jobs.shutdown()
