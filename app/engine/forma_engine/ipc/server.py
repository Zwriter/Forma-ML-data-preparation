import json
import logging
import sys
from forma_engine.domain.errors import FormaError
from forma_engine.ipc.protocol import decode, success, failure


def serve(router, stdin=None, stdout=None):
    stdin = stdin or sys.stdin
    stdout = stdout or sys.stdout
    for line in stdin:
        request_id = None
        try:
            request = decode(line)
            request_id = request["id"]
            response = success(
                request_id, router.dispatch(request["method"], request["params"])
            )
        except Exception as exc:
            if not isinstance(exc, FormaError):
                logging.getLogger("forma.ipc").exception("Unexpected request failure")
            response = failure(request_id, exc)
        stdout.write(json.dumps(response, default=str) + "\n")
        stdout.flush()
