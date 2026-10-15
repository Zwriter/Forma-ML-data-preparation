from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any
from uuid import uuid4


class DatasetState(StrEnum):
    OPEN = "open"
    CLOSED = "closed"
    INVALID = "invalid"


class JobState(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


TRANSFORMATION_TYPES = {
    "drop_duplicates",
    "drop_null_rows",
    "fill_null",
    "rename_columns",
    "drop_columns",
    "convert_type",
    "filter_rows",
}
MAX_PREVIEW = 500


@dataclass
class Dataset:
    source_path: str
    format: str
    schema: list[dict[str, Any]]
    rows: int | None
    dataset_id: str = field(default_factory=lambda: str(uuid4()))
    state: DatasetState = DatasetState.OPEN

    def __post_init__(self):
        self.state = DatasetState(self.state)
        if self.format not in {"csv", "parquet"}:
            raise ValueError("format must be csv or parquet")
        if self.state not in set(DatasetState):
            raise ValueError("invalid dataset state")
        if not isinstance(self.source_path, str) or not self.source_path:
            raise ValueError("source path is required")
        if self.rows is not None and self.rows < 0:
            raise ValueError("rows must be non-negative")

    def to_dict(self):
        return {
            "dataset_id": self.dataset_id,
            "source_path": self.source_path,
            "format": self.format,
            "schema": self.schema,
            "columns": len(self.schema),
            "rows": self.rows,
            "state": self.state.value,
        }


@dataclass
class Transformation:
    type: str
    parameters: dict[str, Any]
    enabled: bool = True
    order: int = 0
    operation_id: str = field(default_factory=lambda: str(uuid4()))

    def __post_init__(self):
        if self.type not in TRANSFORMATION_TYPES:
            raise ValueError("unsupported transformation type")
        if not isinstance(self.parameters, dict):
            raise ValueError("transformation parameters must be an object")
        if not isinstance(self.enabled, bool):
            raise ValueError("enabled must be a boolean")
        if (
            not isinstance(self.order, int)
            or isinstance(self.order, bool)
            or self.order < 0
        ):
            raise ValueError("transformation order must be non-negative")
        if not isinstance(self.operation_id, str) or not self.operation_id:
            raise ValueError("operation ID is required")


@dataclass
class DatasetPreview:
    dataset_id: str
    columns: list[dict[str, Any]]
    records: list[dict[str, Any]]
    offset: int
    limit: int
    total_count: int | None = None

    def __post_init__(self):
        if (
            not isinstance(self.offset, int)
            or isinstance(self.offset, bool)
            or self.offset < 0
        ):
            raise ValueError("preview offset must be non-negative")
        if (
            not isinstance(self.limit, int)
            or isinstance(self.limit, bool)
            or not 0 < self.limit <= MAX_PREVIEW
        ):
            raise ValueError("preview limit must be between 1 and 500")
        if len(self.records) > self.limit:
            raise ValueError("preview records exceed requested limit")
        if self.total_count is not None and self.total_count < 0:
            raise ValueError("total count must be non-negative")


@dataclass
class ExportResult:
    destination: str
    format: str
    row_count: int
    schema: list[dict[str, Any]]
    replaced_existing: bool
    validated: bool

    def __post_init__(self):
        if self.format not in {"csv", "parquet"}:
            raise ValueError("format must be csv or parquet")
        if self.row_count < 0:
            raise ValueError("export row count must be non-negative")
        if not self.destination:
            raise ValueError("export destination is required")
        if not isinstance(self.validated, bool) or not isinstance(
            self.replaced_existing, bool
        ):
            raise ValueError("export flags must be booleans")


@dataclass
class Job:
    kind: str
    job_id: str = field(default_factory=lambda: str(uuid4()))
    state: JobState = JobState.PENDING
    progress: float | None = None
    message: str = "Queued"
    result: dict | None = None
    error: dict | None = None
    cancel_requested: bool = False

    def __post_init__(self):
        self.state = JobState(self.state)
        if self.progress is not None and (
            isinstance(self.progress, bool) or not 0 <= self.progress <= 1
        ):
            raise ValueError("job progress must be between zero and one")

    def transition(self, state: JobState, message: str | None = None):
        allowed = {
            JobState.PENDING: {JobState.RUNNING, JobState.CANCELLED},
            JobState.RUNNING: {JobState.COMPLETED, JobState.FAILED, JobState.CANCELLED},
        }
        if self.state in {
            JobState.COMPLETED,
            JobState.FAILED,
            JobState.CANCELLED,
        } or state not in allowed.get(self.state, set()):
            raise ValueError(f"invalid job transition: {self.state} -> {state}")
        self.state = state
        if state == JobState.RUNNING and self.progress is not None:
            self.progress = 0.0
        if message:
            self.message = message

    def to_dict(self):
        return {
            "job_id": self.job_id,
            "kind": self.kind,
            "state": self.state.value,
            "progress": self.progress,
            "message": self.message,
            "result": self.result,
            "error": self.error,
        }
