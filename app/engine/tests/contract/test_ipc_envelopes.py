import pytest
from forma_engine.ipc.protocol import decode, success
from forma_engine.domain.errors import RequestError, UnsupportedFormatError
from forma_engine.ipc.protocol import failure


def test_decode_requires_correlation_id():
    with pytest.raises(RequestError):
        decode('{"method":"x","params":{}}')


def test_success_correlates_response():
    assert success("r1", {})["id"] == "r1"


@pytest.mark.parametrize(
    "payload",
    ["{}", '{"id":"","method":"x","params":{}}', '{"id":"r","method":"x","params":[]}'],
)
def test_rejects_invalid_request_envelopes(payload):
    with pytest.raises(RequestError):
        decode(payload)


def test_stable_errors_keep_public_code():
    result = failure("r2", UnsupportedFormatError("Choose CSV or Parquet."))
    assert result["id"] == "r2"
    assert result["error"]["code"] == "UNSUPPORTED_FORMAT"


def test_unknown_exception_does_not_leak_details():
    result = failure("r3", RuntimeError("private path C:/secret"))
    assert result["error"]["code"] == "INTERNAL_ERROR"
    assert "C:/secret" not in str(result)


def test_request_size_is_bounded():
    with pytest.raises(RequestError):
        decode(" " * (1024 * 1024 + 1))
