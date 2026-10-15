from pathlib import Path
import os
import tempfile
import polars as pl
from forma_engine.domain.errors import FileAccessError, ExportError


def write_safe(
    frame: pl.LazyFrame,
    destination: str,
    fmt: str,
    force_overwrite: bool,
    cancelled=lambda: False,
) -> dict:
    target = Path(destination).expanduser().resolve()
    if fmt not in {"csv", "parquet"}:
        raise ExportError("Unsupported export format.")
    replaced_existing = target.exists()
    if replaced_existing and not force_overwrite:
        raise FileAccessError(
            "The destination already exists. Confirm overwrite to replace it."
        )
    if not target.parent.exists() or not target.parent.is_dir():
        raise FileAccessError("Choose an existing writable destination folder.")
    temp_name = None
    try:
        with tempfile.NamedTemporaryFile(
            prefix=".forma-", suffix="." + fmt, dir=target.parent, delete=False
        ) as tmp:
            temp_name = tmp.name
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
            raise ExportError("Output validation did not match the cleaned dataset.")
        if fmt == "parquet" and actual_schema != expected_schema:
            raise ExportError("Output types did not match the cleaned dataset.")
        if cancelled():
            raise InterruptedError("Export cancelled")
        os.replace(temp_name, target)
        temp_name = None
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
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)
