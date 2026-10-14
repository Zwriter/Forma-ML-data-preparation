import io
import json
import pytest
from forma_engine.jobs.events import EventPublisher
from forma_engine.domain.errors import FormaError

def test_publisher_emits_one_json_line():
    output = io.StringIO(); EventPublisher(output).publish({"event":"job.progress","job_id":"j1","state":"running","progress":None,"message":"Working"})
    payload = json.loads(output.getvalue())
    assert payload["job_id"] == "j1" and payload["progress"] is None

def test_publisher_rejects_out_of_range_progress():
    with pytest.raises(FormaError): EventPublisher(io.StringIO()).publish({"event":"job.progress","job_id":"j1","progress":2,"message":"Working"})

def test_publisher_bounds_user_message():
    output = io.StringIO(); EventPublisher(output).publish({"event":"job.progress","job_id":"j1","progress":None,"message":"x" * 2000})
    assert len(json.loads(output.getvalue())["message"]) == 1000
