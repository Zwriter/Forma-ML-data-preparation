from concurrent.futures import ThreadPoolExecutor
from threading import RLock
from forma_engine.domain.entities import Job, JobState
from forma_engine.domain.errors import JobNotFoundError, CancelledError, FormaError

class JobManager:
    def __init__(self, publisher):
        self.publisher = publisher; self.jobs = {}; self.lock = RLock(); self.pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="forma")
    def submit(self, kind, work):
        job = Job(kind); self.jobs[job.job_id] = job
        self.pool.submit(self._run, job, work)
        return {"job_id": job.job_id, "state": job.state.value}
    def _emit(self, job):
        name = "job." + (job.state.value if job.state in {JobState.COMPLETED, JobState.FAILED, JobState.CANCELLED} else "progress")
        self.publisher.publish({"event": name, **job.to_dict()})
    def _run(self, job, work):
        try:
            with self.lock:
                if job.cancel_requested: job.transition(JobState.CANCELLED, "Cancelled"); self._emit(job); return
                job.transition(JobState.RUNNING, "Working")
            self._emit(job)
            result = work(lambda: job.cancel_requested)
            with self.lock:
                if job.cancel_requested: job.transition(JobState.CANCELLED, "Cancelled")
                else: job.result = result; job.progress = 1.0; job.transition(JobState.COMPLETED, "Completed")
        except CancelledError:
            with self.lock: job.transition(JobState.CANCELLED, "Cancelled")
        except Exception as exc:
            with self.lock:
                job.error = {"code": exc.code, "message": exc.message, "details": exc.details} if isinstance(exc, FormaError) else {"code": "INTERNAL_ERROR", "message": "The operation failed."}
                job.transition(JobState.FAILED, "Failed")
        self._emit(job)
    def get(self, job_id):
        job = self.jobs.get(job_id)
        if not job: raise JobNotFoundError("Job was not found.")
        return job
    def status(self, job_id): return self.get(job_id).to_dict()
    def cancel(self, job_id):
        job = self.get(job_id)
        with self.lock:
            if job.state in {JobState.PENDING, JobState.RUNNING}: job.cancel_requested = True
        return {"job_id": job_id, "state": job.state.value, "cancel_requested": job.cancel_requested}
    def shutdown(self): self.pool.shutdown(wait=True, cancel_futures=False)
