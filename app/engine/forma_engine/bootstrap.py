from forma_engine.core.logging import configure_logging
from forma_engine.jobs.events import EventPublisher
from forma_engine.jobs.manager import JobManager
from forma_engine.services.dataset_service import DatasetService
from forma_engine.services.cleaning_service import CleaningService
from forma_engine.services.export_service import ExportService
from forma_engine.services.profile_service import ProfileService
from forma_engine.ipc.router import Router
from forma_engine.ipc.server import serve

def build_router(publisher=None):
    publisher = publisher or EventPublisher()
    datasets = DatasetService(); jobs = JobManager(publisher)
    return Router(datasets, CleaningService(datasets, jobs), ProfileService(datasets, jobs), jobs, ExportService(datasets)), jobs

def main():
    configure_logging(); router, jobs = build_router()
    try: serve(router)
    finally: jobs.shutdown()
