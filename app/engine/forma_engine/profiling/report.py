from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

MAX_BINS = 50
MAX_CATEGORIES = 10
MAX_EXAMPLES = 3


def utc_now() -> str:
    """The current time as ISO text ending in Z, as every profile result uses."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _non_negative(**counts: int) -> None:
    for name, count in counts.items():
        if count < 0:
            raise ValueError(f"{name} must be non-negative")


@dataclass
class HistogramBin:
    start: Any
    end: Any
    count: int


@dataclass
class NumericSummary:
    mean: Any
    median: Any
    std: float
    min: Any
    max: Any
    histogram: list[HistogramBin]

    def __post_init__(self):
        if not 1 <= len(self.histogram) <= MAX_BINS:
            raise ValueError(f"histogram must have 1-{MAX_BINS} bins")


@dataclass
class CategorySummary:
    top: list[dict[str, Any]]
    other_count: int
    distinct_count: int

    def __post_init__(self):
        if len(self.top) > MAX_CATEGORIES:
            raise ValueError(f"at most {MAX_CATEGORIES} categories")
        _non_negative(other_count=self.other_count)


@dataclass
class ColumnProfile:
    position: int
    name: str
    stored_type: str
    detected_type: str
    missing_count: int
    invalid_count: int
    unique_count: int
    completeness: float | None
    quality: str
    examples: list[str]
    numeric: NumericSummary | None = None
    categories: CategorySummary | None = None

    def __post_init__(self):
        _non_negative(
            missing_count=self.missing_count,
            invalid_count=self.invalid_count,
            unique_count=self.unique_count,
        )
        if len(self.examples) > MAX_EXAMPLES:
            raise ValueError(f"at most {MAX_EXAMPLES} examples")


@dataclass
class Profile:
    """Bounded data-quality summary of one dataset at one data version."""

    dataset_id: str
    history_id: str
    data_version: str
    computed_at: str
    row_count: int
    column_count: int
    missing_cells: int
    duplicate_rows: int
    quality: dict[str, Any]  # from profiling.quality.breakdown
    columns: list[ColumnProfile] = field(default_factory=list)

    def __post_init__(self):
        _non_negative(
            row_count=self.row_count,
            missing_cells=self.missing_cells,
            duplicate_rows=self.duplicate_rows,
        )
        if len(self.columns) != self.column_count:
            raise ValueError("column_count must match the column profiles")

    def to_dict(self) -> dict:
        return asdict(self)
