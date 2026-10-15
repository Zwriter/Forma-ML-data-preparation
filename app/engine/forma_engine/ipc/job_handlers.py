from forma_engine.domain.errors import RequestError


class JobHandlers:
    def __init__(self, jobs):
        self.jobs = jobs

    def status(self, params):
        return self.jobs.status(self._job_id(params))

    def cancel(self, params):
        return self.jobs.cancel(self._job_id(params))

    def _job_id(self, params):
        value = params.get("job_id")
        if not isinstance(value, str) or not value:
            raise RequestError("Provide a job_id.")
        return value
