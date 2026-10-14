import csv
from pathlib import Path
import polars as pl
from forma_engine.domain.errors import (
    FileAccessError,
    InvalidDatasetError,
    UnsupportedFormatError,
)


def detect_format(path: str) -> str:
    suffix = Path(path).suffix.lower().lstrip(".")
    if suffix not in {"csv", "parquet"}:
        raise UnsupportedFormatError("Choose a CSV or Parquet file.")
    return suffix


def scan(path: str) -> pl.LazyFrame:
    file = Path(path)
    if not file.is_file():
        raise FileAccessError("The selected file does not exist or is not a file.")
    if not file.stat().st_size:
        raise InvalidDatasetError("The selected file is empty.")
    try:
        with file.open("rb") as source:
            source.read(1)
    except OSError as exc:
        raise FileAccessError("The selected file cannot be read.") from exc
    fmt = detect_format(str(file))
    try:
        if fmt == "csv":
            _validate_csv_header(file)
        frame = (
            pl.scan_csv(file, infer_schema_length=1000, try_parse_dates=True)
            if fmt == "csv"
            else pl.scan_parquet(file)
        )
        schema = frame.collect_schema()
        if len(schema) == 0:
            raise InvalidDatasetError("The file has no columns.")
        names = list(schema.names())
        if any(not name.strip() for name in names):
            raise InvalidDatasetError("Column names cannot be empty.")
        if len(set(names)) != len(names):
            raise InvalidDatasetError("Column names must be unique.")
        return frame
    except (FileAccessError, InvalidDatasetError, UnsupportedFormatError):
        raise
    except PermissionError as exc:
        raise FileAccessError("The selected file cannot be read.") from exc
    except Exception as exc:
        raise InvalidDatasetError(
            "The file could not be read as a valid dataset."
        ) from exc


def _validate_csv_header(path: Path) -> None:
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as source:
            header = next(csv.reader(source), [])
    except (OSError, UnicodeError, csv.Error) as exc:
        raise InvalidDatasetError("The CSV header could not be read.") from exc
    if not header or any(not name.strip() for name in header):
        raise InvalidDatasetError("Column names cannot be empty.")
    if len(set(header)) != len(header):
        raise InvalidDatasetError("Column names must be unique.")


def schema_for(frame: pl.LazyFrame) -> list[dict]:
    return [
        {"name": name, "type": str(dtype), "nullable": True}
        for name, dtype in frame.collect_schema().items()
    ]


def row_count(frame: pl.LazyFrame, path: str | None = None) -> int | None:
    if (
        path
        and Path(path).suffix.lower() == ".csv"
        and Path(path).stat().st_size > 50 * 1024 * 1024
    ):
        return None
    # Collect the transformed rows so Polars cannot optimize away an invalid
    # cast while answering a metadata-only length query.
    return int(frame.collect(engine="streaming").height)
