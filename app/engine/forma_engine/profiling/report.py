from dataclasses import dataclass
from typing import Any


@dataclass
class ProfileReport:
    dataset_id: str
    row_count: int | None
    column_count: int
    missing_counts: dict[str, int]
    distinct_counts: dict[str, int]
    type_summary: dict[str, str]
    numeric_summaries: dict[str, dict[str, Any]]
    categorical_frequencies: dict[str, list[dict[str, Any]]]
    duplicate_count: int | None

    def to_dict(self) -> dict:
        return {
            "dataset_id": self.dataset_id,
            "row_count": self.row_count,
            "column_count": self.column_count,
            "missing_counts": self.missing_counts,
            "distinct_counts": self.distinct_counts,
            "type_summary": self.type_summary,
            "numeric_summaries": self.numeric_summaries,
            "categorical_frequencies": self.categorical_frequencies,
            "duplicate_count": self.duplicate_count,
        }
