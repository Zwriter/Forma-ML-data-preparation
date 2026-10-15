import json
import sys
from threading import Lock
from forma_engine.domain.errors import FormaError


class EventPublisher:
    def __init__(self, stream=None):
        self.stream = stream or sys.stdout
        self.lock = Lock()

    def publish(self, event: dict):
        if (
            not isinstance(event, dict)
            or not isinstance(event.get("event"), str)
            or not isinstance(event.get("job_id"), str)
        ):
            raise FormaError("Job event is missing required fields.")
        progress = event.get("progress")
        if progress is not None and (
            not isinstance(progress, (int, float))
            or isinstance(progress, bool)
            or not 0 <= progress <= 1
        ):
            raise FormaError("Job progress must be between zero and one.")
        message = event.get("message")
        if not isinstance(message, str):
            raise FormaError("Job event message must be text.")
        event["message"] = message[:1000]
        with self.lock:
            self.stream.write(json.dumps(event, default=str) + "\n")
            self.stream.flush()
