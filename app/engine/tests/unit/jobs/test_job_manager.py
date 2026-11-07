from threading import Event
import time
from forma_engine.jobs.manager import JobManager


class Publisher:
    def publish(self, event):
        pass


def test_job_completes():
    manager = JobManager(Publisher())
    done = Event()
    ack = manager.submit("profile", lambda cancel: {"ok": True})
    for _ in range(100):
        if manager.status(ack["job_id"])["state"] == "completed":
            done.set()
            break
        time.sleep(0.01)
    assert done.is_set()
    manager.shutdown()


def test_job_failure_has_safe_error_and_terminal_state():
    manager = JobManager(Publisher())
    gate = Event()

    def fail(cancel):
        gate.wait(1)
        raise ValueError("private failure")

    ack = manager.submit("clean", fail)
    gate.set()
    for _ in range(100):
        if manager.status(ack["job_id"])["state"] == "failed":
            break
        time.sleep(0.01)
    job = manager.status(ack["job_id"])
    assert job["error"]["code"] == "INTERNAL_ERROR"
    assert "private failure" not in str(job)
    manager.shutdown()


def test_running_job_cancels_cooperatively():
    manager = JobManager(Publisher())
    started = Event()
    release = Event()

    def work(cancel):
        started.set()
        while not cancel():
            time.sleep(0.005)
        return {"ignored": True}

    ack = manager.submit("export", work)
    assert started.wait(1)
    manager.cancel(ack["job_id"])
    release.set()
    for _ in range(100):
        if manager.status(ack["job_id"])["state"] == "cancelled":
            break
        time.sleep(0.01)
    assert manager.status(ack["job_id"])["state"] == "cancelled"
    manager.shutdown()


def test_indeterminate_job_progress_is_nullable():
    manager = JobManager(Publisher())
    started = Event()
    release = Event()

    def work(cancel):
        started.set()
        release.wait(1)
        return {"ok": True}

    ack = manager.submit("profile", work)
    assert started.wait(1)
    assert manager.status(ack["job_id"])["progress"] is None
    release.set()
    manager.shutdown()


class Recorder:
    def __init__(self):
        self.events = []

    def publish(self, event):
        self.events.append(event)


def wait_for(manager, job_id, state):
    for _ in range(200):
        if manager.status(job_id)["state"] == state:
            return
        time.sleep(0.01)
    raise AssertionError(f"job never reached {state}")


def test_workers_can_report_progress_and_still_check_cancel():
    recorder = Recorder()
    manager = JobManager(recorder)

    def work(token):
        assert token() is False  # still callable like the old cancel check
        token.report(0.25, "Detecting types")
        token.report(7, "Clamped")
        return {"ok": True}

    ack = manager.submit("profile", work)
    wait_for(manager, ack["job_id"], "completed")
    manager.shutdown()

    progress = [e for e in recorder.events if e["event"] == "job.progress"]
    reported = [(e["progress"], e["message"]) for e in progress[1:]]
    assert reported == [(0.25, "Detecting types"), (1.0, "Clamped")]
    assert all(e["job_id"] == ack["job_id"] for e in progress)


def test_jobs_that_never_report_emit_only_start_and_finish():
    recorder = Recorder()
    manager = JobManager(recorder)
    ack = manager.submit("export", lambda cancel: {"ok": True})
    wait_for(manager, ack["job_id"], "completed")
    manager.shutdown()

    assert [e["event"] for e in recorder.events] == ["job.progress", "job.completed"]


def test_the_acknowledgement_is_pending_even_for_an_instant_job():
    manager = JobManager(Recorder())
    acks = [manager.submit("export", lambda cancel: {"ok": True}) for _ in range(50)]
    manager.shutdown()
    assert {ack["state"] for ack in acks} == {"pending"}


def test_an_abandonable_job_is_cancelled_at_once_and_its_late_result_dropped():
    publisher = Recorder()
    manager = JobManager(publisher)
    started, release, finished = Event(), Event(), Event()

    def work(cancel):
        started.set()
        release.wait(5)  # a long query that cannot see the cancel
        finished.set()
        return {"late": True}

    ack = manager.submit("profile", work, abandon_on_cancel=True)
    assert started.wait(1)
    reply = manager.cancel(ack["job_id"])

    assert reply["state"] == "cancelled"
    assert manager.status(ack["job_id"])["state"] == "cancelled"
    release.set()
    assert finished.wait(1)
    manager.shutdown()
    job = manager.status(ack["job_id"])
    assert job["state"] == "cancelled" and job.get("result") is None
    terminal = [e for e in publisher.events if e["event"] != "job.progress"]
    assert [e["event"] for e in terminal] == ["job.cancelled"]


def test_jobs_wait_for_their_worker_to_cancel_by_default():
    manager = JobManager(Publisher())
    started, release = Event(), Event()

    def work(cancel):
        started.set()
        release.wait(5)
        return {"committed": True}

    ack = manager.submit("export", work)
    assert started.wait(1)
    assert manager.cancel(ack["job_id"])["state"] == "running"
    release.set()
    manager.shutdown()
