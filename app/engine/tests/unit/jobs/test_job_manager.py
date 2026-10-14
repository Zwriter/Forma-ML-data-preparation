from threading import Event
import time
from forma_engine.jobs.manager import JobManager

class Publisher:
    def publish(self, event): pass

def test_job_completes():
    manager = JobManager(Publisher()); done = Event()
    ack = manager.submit("profile", lambda cancel: {"ok": True})
    for _ in range(100):
        if manager.status(ack["job_id"])["state"] == "completed": done.set(); break
        time.sleep(.01)
    assert done.is_set(); manager.shutdown()

def test_job_failure_has_safe_error_and_terminal_state():
    manager = JobManager(Publisher()); gate = Event()
    def fail(cancel): gate.wait(1); raise ValueError("private failure")
    ack = manager.submit("clean", fail); gate.set()
    for _ in range(100):
        if manager.status(ack["job_id"])["state"] == "failed": break
        time.sleep(.01)
    job = manager.status(ack["job_id"])
    assert job["error"]["code"] == "INTERNAL_ERROR"
    assert "private failure" not in str(job)
    manager.shutdown()

def test_running_job_cancels_cooperatively():
    manager = JobManager(Publisher()); started = Event(); release = Event()
    def work(cancel):
        started.set()
        while not cancel(): time.sleep(.005)
        return {"ignored": True}
    ack = manager.submit("export", work); assert started.wait(1)
    manager.cancel(ack["job_id"]); release.set()
    for _ in range(100):
        if manager.status(ack["job_id"])["state"] == "cancelled": break
        time.sleep(.01)
    assert manager.status(ack["job_id"])["state"] == "cancelled"
    manager.shutdown()

def test_indeterminate_job_progress_is_nullable():
    manager = JobManager(Publisher()); started = Event(); release = Event()
    def work(cancel): started.set(); release.wait(1); return {"ok": True}
    ack = manager.submit("profile", work); assert started.wait(1)
    assert manager.status(ack["job_id"])["progress"] is None
    release.set()
    manager.shutdown()
