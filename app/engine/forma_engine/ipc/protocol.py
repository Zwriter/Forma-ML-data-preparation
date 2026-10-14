import json
from forma_engine.domain.errors import FormaError, RequestError
MAX_REQUEST_BYTES = 1024 * 1024

def decode(line: str) -> dict:
    if len(line.encode("utf-8")) > MAX_REQUEST_BYTES: raise RequestError("Request exceeds the 1 MiB size limit.")
    try: value = json.loads(line)
    except Exception as exc: raise RequestError("Request must be valid JSON.") from exc
    if not isinstance(value, dict) or not isinstance(value.get("id"), str) or not value["id"].strip() or not isinstance(value.get("method"), str) or not value["method"].strip() or not isinstance(value.get("params", {}), dict):
        raise RequestError("Request requires a non-empty id, method, and object params.")
    return {"id": value["id"], "method": value["method"], "params": value.get("params", {})}

def success(request_id, result): return {"id": request_id, "status": "success", "result": result, "error": None}
def failure(request_id, error):
    if isinstance(error, FormaError): payload = {"code": error.code, "message": error.message, "details": error.details or None}
    else: payload = {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred.", "details": None}
    return {"id": request_id, "status": "error", "result": None, "error": payload}
