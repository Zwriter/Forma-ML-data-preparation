"""Pages of rows with problem cells, for Data quality (FR-038)."""

import polars as pl

from forma_engine.profiling.cancellable import collect
from forma_engine.profiling.rejects import PHRASES, reason_expression
from forma_engine.profiling.tools.common import box_summary, detected_types
from forma_engine.profiling.tools.outliers import outside
from forma_engine.profiling.type_detection import invalid_mask

MAX_TEXT = 200
ROW = "__forma_row"


def _cells(names, types, schema) -> list[pl.Expr]:
    """Per column: the value as text (cut to 200), whether it is invalid, its reason."""
    cells = []
    for i, name in enumerate(names):
        kind = types[name]
        text = pl.col(name).cast(pl.String, strict=False).str.slice(0, MAX_TEXT)
        cells += [
            text.alias(f"v{i}"),
            invalid_mask(name, kind, schema[name]).alias(f"i{i}"),
        ]
        if kind in PHRASES:
            cells.append(reason_expression(name, kind).alias(f"r{i}"))
    return cells


def _row(record: dict, names: list[str], rule: dict) -> dict:
    values, marks, reasons = [], {}, {}
    for i, name in enumerate(names):
        value = record[f"v{i}"]
        values.append(value)
        if value is None:
            marks[name] = "missing"
        elif record[f"i{i}"]:
            marks[name] = "invalid"
            reasons[name] = record[f"r{i}"]
    if rule["kind"] == "outliers":
        marks[rule["column"]] = "outlier"
    return {
        "row": int(record[ROW]),
        "values": values,
        "marks": marks,
        "reasons": reasons,
    }


def _matching(rule: dict, types: dict, schema, frame, token) -> pl.Expr:
    """Rows with a problem cell (in one or any column), or an outlier in the column."""
    if rule["kind"] == "outliers":
        name = rule["column"]
        kind, dtype = types[name], schema[name]
        return outside(name, kind, dtype, box_summary(frame, name, kind, dtype, token))
    scope = [rule["column"]] if rule["column"] else schema.names()
    return pl.any_horizontal(
        pl.col(name).is_null() | invalid_mask(name, types[name], schema[name])
        for name in scope
    )


def rows(context, params: dict) -> dict:
    rule, offset, limit = params["filter"], params["offset"], params["limit"]
    types = detected_types(context)
    frame, token = context.frame, context.token
    schema = frame.collect_schema()
    names = schema.names()
    keep = _matching(rule, types, schema, frame, token)
    matching = frame.with_row_index(ROW, offset=1).filter(keep)
    total = int(collect(matching.select(pl.len()), token).item())
    page = matching.slice(offset, limit).select(
        pl.col(ROW), *_cells(names, types, schema)
    )
    found = collect(page, token)
    return {
        "columns": names,
        "total": total,
        "offset": offset,
        "rows": [_row(record, names, rule) for record in found.iter_rows(named=True)],
    }
