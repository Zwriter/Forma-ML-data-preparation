from contextlib import contextmanager
from pathlib import Path
import os
import tempfile
import polars as pl
from forma_engine.domain.errors import FileAccessError, ExportError


def _target(destination: str, force_overwrite: bool) -> tuple[Path, bool]:
    """The resolved destination and whether it replaces a file; refuses bad targets."""
    target = Path(destination).expanduser().resolve()
    replaced_existing = target.exists()
    if replaced_existing and not force_overwrite:
        raise FileAccessError(
            "The destination already exists. Confirm overwrite to replace it."
        )
    if not target.parent.exists() or not target.parent.is_dir():
        raise FileAccessError("Choose an existing writable destination folder.")
    return target, replaced_existing


@contextmanager
def _atomic(target: Path, suffix: str):
    """Yields a temp path beside target, moved into place only if the block succeeds,
    so a failed or cancelled write never leaves a partial file."""
    temp_name = None
    try:
        with tempfile.NamedTemporaryFile(
            prefix=".forma-", suffix=suffix, dir=target.parent, delete=False
        ) as tmp:
            temp_name = tmp.name
        yield temp_name
        os.replace(temp_name, target)
        temp_name = None
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)


def write_text_safe(
    text: str, destination: str, force_overwrite: bool, cancelled=lambda: False
) -> dict:
    target, replaced_existing = _target(destination, force_overwrite)
    data = text.encode("utf-8")
    try:
        with _atomic(target, target.suffix) as temp_name:
            Path(temp_name).write_bytes(data)
            if cancelled():
                raise InterruptedError("Write cancelled")
    except InterruptedError:
        raise  # a subclass of OSError, but a cancel is not a write failure
    except PermissionError as exc:
        raise FileAccessError("The destination cannot be written.") from exc
    except OSError as exc:
        raise FileAccessError("The destination could not be written.") from exc
    return {
        "destination": str(target),
        "bytes": len(data),
        "replaced_existing": replaced_existing,
    }


def write_safe(
    frame: pl.LazyFrame,
    destination: str,
    fmt: str,
    force_overwrite: bool,
    cancelled=lambda: False,
) -> dict:
    if fmt not in {"csv", "parquet"}:
        raise ExportError("Unsupported export format.")
    target, replaced_existing = _target(destination, force_overwrite)
    try:
        with _atomic(target, "." + fmt) as temp_name:
            expected_schema = frame.collect_schema()
            if cancelled():
                raise InterruptedError("Export cancelled")
            if fmt == "csv":
                frame.sink_csv(temp_name)
            else:
                frame.sink_parquet(temp_name)
            check = (
                pl.scan_csv(temp_name, try_parse_dates=True)
                if fmt == "csv"
                else pl.scan_parquet(temp_name)
            )
            actual_schema = check.collect_schema()
            actual_rows = int(check.select(pl.len()).collect().item())
            if actual_schema.names() != expected_schema.names():
                raise ExportError(
                    "Output validation did not match the cleaned dataset."
                )
            if fmt == "parquet" and actual_schema != expected_schema:
                raise ExportError("Output types did not match the cleaned dataset.")
            if cancelled():
                raise InterruptedError("Export cancelled")
        return {
            "destination": str(target),
            "format": fmt,
            "row_count": actual_rows,
            "schema": [
                {"name": k, "type": str(v), "nullable": True}
                for k, v in expected_schema.items()
            ],
            "replaced_existing": replaced_existing,
            "validated": True,
        }
    except (FileAccessError, ExportError, InterruptedError):
        raise
    except PermissionError as exc:
        raise FileAccessError("The destination cannot be written.") from exc
    except OSError as exc:
        raise FileAccessError("The destination could not be written.") from exc
    except Exception as exc:
        raise ExportError(
            "The output could not be safely written or validated."
        ) from exc
