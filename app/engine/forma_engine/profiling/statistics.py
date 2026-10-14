import polars as pl
from forma_engine.domain.errors import CancelledError
from forma_engine.profiling.report import ProfileReport

def profile(frame: pl.LazyFrame, dataset_id: str, frequencies: bool = True, cancelled=lambda: False) -> dict:
    if cancelled(): raise CancelledError("Profiling was cancelled.")
    schema = frame.collect_schema(); names = schema.names()
    expressions = []
    for name, dtype in schema.items():
        expressions.extend([pl.col(name).null_count().alias(f"missing::{name}"), pl.col(name).n_unique().alias(f"distinct::{name}")])
        if dtype.is_numeric():
            expressions.extend([pl.col(name).min().alias(f"min::{name}"), pl.col(name).max().alias(f"max::{name}"),
                                pl.col(name).mean().alias(f"mean::{name}"), pl.col(name).median().alias(f"median::{name}")])
    aggregate = frame.select(expressions).collect().row(0, named=True) if expressions else {}
    if cancelled(): raise CancelledError("Profiling was cancelled.")
    rows = int(frame.select(pl.len()).collect().item())
    missing = {name: int(aggregate[f"missing::{name}"]) for name in names}
    distinct = {name: int(aggregate[f"distinct::{name}"]) for name in names}
    numeric = {name: {key: aggregate[f"{key}::{name}"] for key in ("min", "max", "mean", "median")}
               for name, dtype in schema.items() if dtype.is_numeric()}
    cats = {}
    if frequencies:
        for name, dtype in schema.items():
            if cancelled(): raise CancelledError("Profiling was cancelled.")
            if not dtype.is_numeric(): cats[name] = frame.group_by(name).len().sort("len", descending=True).head(20).collect().to_dicts()
    unique_rows = int(frame.select(pl.struct(names).n_unique()).collect().item()) if names else rows
    if cancelled(): raise CancelledError("Profiling was cancelled.")
    duplicates = rows - unique_rows
    return ProfileReport(dataset_id, rows, len(names), missing, distinct, {k: str(v) for k, v in schema.items()}, numeric, cats, duplicates).to_dict()
