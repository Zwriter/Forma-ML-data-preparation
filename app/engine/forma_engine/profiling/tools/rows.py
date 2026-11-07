"""Pages of rows with problem cells, for Data quality (FR-038)."""

import polars as pl

from forma_engine.domain.errors import RequestError
from forma_engine.profiling.cancellable import collect
from forma_engine.profiling.rejects import PHRASES, reason_expression
from forma_engine.profiling.tools.common import detected_types
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


def _row(record: dict, names: list[str]) -> dict:
    values, marks, reasons = [], {}, {}
    for i, name in enumerate(names):
        value = record[f"v{i}"]
        values.append(value)
        if value is None:
            marks[name] = "missing"
        elif record[f"i{i}"]:
            marks[name] = "invalid"
            reasons[name] = record[f"r{i}"]
    return {
        "row": int(record[ROW]),
        "values": values,
        "marks": marks,
        "reasons": reasons,
    }


def rows(context, params: dict) -> dict:
    rule, offset, limit = params["filter"], params["offset"], params["limit"]
    if rule["kind"] != "problems":
        raise RequestError("Outlier rows are not available yet.")
    types = detected_types(context)
    frame, token = context.frame, context.token
    schema = frame.collect_schema()
    names = schema.names()
    scope = [rule["column"]] if rule["column"] else names
    problem = [
        pl.col(name).is_null() | invalid_mask(name, types[name], schema[name])
        for name in scope
    ]
    matching = frame.with_row_index(ROW, offset=1).filter(pl.any_horizontal(problem))
    total = int(collect(matching.select(pl.len()), token).item())
    page = matching.slice(offset, limit).select(
        pl.col(ROW), *_cells(names, types, schema)
    )
    found = collect(page, token)
    return {
        "columns": names,
        "total": total,
        "offset": offset,
        "rows": [_row(record, names) for record in found.iter_rows(named=True)],
    }
