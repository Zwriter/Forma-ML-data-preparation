import polars as pl
from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.filter_parser import compile_rules, parse_filter


def apply(frame: pl.LazyFrame, operation: dict) -> pl.LazyFrame:
    kind, p = operation["type"], operation.get("parameters", {})
    if kind == "drop_duplicates":
        return frame.unique(subset=p.get("columns"), maintain_order=True)
    if kind == "drop_null_rows":
        return frame.drop_nulls(subset=p.get("columns"))
    if kind == "fill_null":
        col, strategy = p["column"], p["strategy"]
        if strategy == "constant":
            return frame.with_columns(pl.col(col).fill_null(p["value"]))
        if strategy in {"mean", "median"}:
            return frame.with_columns(
                pl.col(col).fill_null(
                    pl.col(col).mean() if strategy == "mean" else pl.col(col).median()
                )
            )
        return frame.with_columns(pl.col(col).fill_null(pl.col(col).mode().first()))
    if kind == "rename_columns":
        return frame.rename(p["mapping"])
    if kind == "drop_columns":
        return frame.drop(p["columns"])
    if kind == "convert_type":
        types = {
            "string": pl.String,
            "integer": pl.Int64,
            "float": pl.Float64,
            "boolean": pl.Boolean,
            "date": pl.Date,
        }
        return frame.with_columns(pl.col(p["column"]).cast(types[p["to"]], strict=True))
    if kind == "filter_rows":
        if "rules" in p:
            schema = frame.collect_schema()
            return frame.filter(compile_rules(p["rules"], p["mode"], schema))
        return frame.filter(
            parse_filter(p["expression"], frame.collect_schema().names())
        )
    if kind == "sort_rows":
        keys = p["keys"]
        return frame.sort(
            by=[key["column"] for key in keys],
            descending=[key["direction"] == "descending" for key in keys],
            nulls_last=[key["nulls"] == "last" for key in keys],
            maintain_order=True,
        )
    if kind in {"group_by", "pivot", "unpivot"}:
        raise InvalidTransformationError(
            "This data operation is not available yet; "
            "the current dataset is unchanged."
        )
    return frame
