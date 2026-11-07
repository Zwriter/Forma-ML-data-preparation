"""Shared IPC parameter checks."""

from forma_engine.domain.errors import RequestError


def required_text(params, key, message):
    value = params.get(key)
    if not isinstance(value, str) or not value.strip():
        raise RequestError(message)
    return value


def flag(params, key):
    value = params.get(key, False)
    if not isinstance(value, bool):
        raise RequestError(f"{key} must be a boolean.")
    return value
