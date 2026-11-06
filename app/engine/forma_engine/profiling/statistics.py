from datetime import datetime, timezone

import polars as pl

from forma_engine.domain.errors import CancelledError
from forma_engine.profiling.column_stats import NUMERIC, column_stats, examples
from forma_engine.profiling.distributions import categories, histogram
from forma_engine.profiling.quality import breakdown, completeness, quality_level
from forma_engine.profiling.report import ColumnProfile, NumericSummary, Profile
from forma_engine.profiling.type_detection import detect_types

CATEGORICAL = {"text", "boolean"}
BATCH = 10  # columns summarised between progress reports and cancel checks


class _NoToken:
    """Lets scripts call profile() without a job: never cancelled, no progress."""

    def __call__(self) -> bool:
        return False

    def report(self, fraction: float, message: str) -> None:
        pass


def _phase(token, fraction: float, message: str) -> None:
    if token():
        raise CancelledError("Profiling was cancelled.")
    token.report(fraction, message)


def _duplicates(frame: pl.LazyFrame, names: list[str], rows: int) -> int:
    if not names or not rows:
        return 0
    return rows - int(frame.select(pl.struct(names).n_unique()).collect().item())


def _summaries(frame, schema, types, stats, token) -> dict:
    """Histogram or top values per column, in batches with progress and cancel checks"""
    names = schema.names()
    result = {}
    for start in range(0, len(names), BATCH):
        _phase(token, 0.8 + 0.19 * start / len(names), "Building distributions")
        for name in names[start : start + BATCH]:
            kind, dtype = types[name], schema[name]
            numeric = categories_ = None
            if kind in NUMERIC and stats[name]["numeric"]:
                bins = histogram(frame, name, kind, dtype)
                if bins:
                    numeric = NumericSummary(**stats[name]["numeric"], histogram=bins)
            elif kind in CATEGORICAL:
                categories_ = categories(frame, name, kind, dtype)
            result[name] = {"numeric": numeric, "categories": categories_}
    return result


def profile(frame, dataset_id, history_id, data_version, token=None) -> dict:
    token = token or _NoToken()
    schema = frame.collect_schema()
    _phase(token, 0.0, "Detecting types")
    types = detect_types(frame)
    _phase(token, 0.3, "Computing column statistics")
    rows, stats = column_stats(frame, types)
    samples = examples(frame, types)
    _phase(token, 0.7, "Finding duplicates")
    duplicates = _duplicates(frame, schema.names(), rows)
    summaries = _summaries(frame, schema, types, stats, token)
    if token():
        raise CancelledError("Profiling was cancelled.")
    columns = [
        ColumnProfile(
            position=index + 1,
            name=name,
            stored_type=str(dtype),
            detected_type=types[name],
            missing_count=stats[name]["missing"],
            invalid_count=stats[name]["invalid"],
            unique_count=stats[name]["unique"],
            completeness=completeness(
                rows, stats[name]["missing"], stats[name]["invalid"]
            ),
            quality=quality_level(rows, stats[name]["missing"], stats[name]["invalid"]),
            examples=samples[name],
            **summaries[name],
        )
        for index, (name, dtype) in enumerate(schema.items())
    ]
    cells = breakdown(rows, [(c.missing_count, c.invalid_count) for c in columns])
    return Profile(
        dataset_id=dataset_id,
        history_id=history_id,
        data_version=data_version,
        computed_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        row_count=rows,
        column_count=len(columns),
        missing_cells=cells["missing_cells"],
        duplicate_rows=duplicates,
        quality=cells,
        columns=columns,
    ).to_dict()
