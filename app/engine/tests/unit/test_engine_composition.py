import io
import sys
from forma_engine.bootstrap import build_router
from forma_engine.core.logging import configure_logging


class Publisher:
    def __init__(self):
        self.events = []

    def publish(self, event):
        self.events.append(event)


def test_composition_returns_router_with_dataset_and_jobs():
    router, jobs = build_router(Publisher())
    assert router.datasets is not None
    assert jobs is router.jobs
    jobs.shutdown()


def test_configured_diagnostics_target_stderr(monkeypatch):
    stream = io.StringIO()
    monkeypatch.setattr(sys, "stderr", stream)
    logger = configure_logging()
    assert logger.handlers[0].stream is sys.stderr
