"""Common value shapes per text column, for Patterns (FR-041)."""

import polars as pl

from forma_engine.profiling.cancellable import collect

SHAPE_LENGTH = 30
TOP = 5
MIXED_BELOW = 0.9


def shape(name: str) -> pl.Expr:
    """Letters become "A", digits "9", other characters stay; cut to 30."""
    return (
        pl.col(name)
        .str.replace_all(r"\p{L}", "A")
        .str.replace_all(r"\p{Nd}", "9")
        .str.slice(0, SHAPE_LENGTH)
    )


def _column(frame: pl.LazyFrame, name: str, token) -> dict:
    counts = collect(
        frame.select(shape(name).alias("shape"))
        .drop_nulls()
        .group_by("shape", maintain_order=True)
        .len("count")
        .sort("count", descending=True, maintain_order=True),
        token,
    )
    present = int(counts["count"].sum()) if counts.height else 0
    top = [
        {"shape": row[0], "count": int(row[1]), "share": row[1] / present}
        for row in counts.head(TOP).iter_rows()
    ]
    return {
        "column": name,
        "formats": top,
        "mixed": bool(top) and top[0]["share"] < MIXED_BELOW,
    }


def formats(context) -> list[dict]:
    return [
        _column(context.frame, column["name"], context.token)
        for column in context.profile["columns"]
        if column["detected_type"] == "text"
    ]
