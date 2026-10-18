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
    if kind == "group_by":
        groups = p["group_columns"]
        aggregations = []
        for aggregation in p["aggregations"]:
            column, function = aggregation.get("column"), aggregation["function"]
            expression = (
                pl.len() if column is None else pl.col(column).count()
            ) if function == "count" else {
                "sum": pl.col(column).sum,
                "average": pl.col(column).mean,
                "minimum": pl.col(column).min,
                "maximum": pl.col(column).max,
            }[function]()
            aggregations.append(expression.alias(aggregation["output_name"]))
        return frame.group_by(groups, maintain_order=True).agg(aggregations)
    if kind == "pivot":
        rows, category = p["row_columns"], p["category_column"]
        categories = frame.select(pl.col(category).unique()).collect().to_series().to_list()
        categories.sort(key=lambda item: (item is None, str(item)))
        if not categories:
            return frame.select(rows).limit(0)
        aggregate = {
            "count": "len", "sum": "sum", "average": "mean",
            "minimum": "min", "maximum": "max",
        }[p["function"]]
        result = frame.collect().pivot(
            on=category, on_columns=categories, index=rows,
            values=p["value_column"], aggregate_function=aggregate,
            maintain_order=True,
        )
        generated = {}
        for item in categories:
            old_name = str(item) if item is not None else "null"
            new_name = f"{category}_{old_name}"
            if new_name in rows or new_name in generated.values():
                raise InvalidTransformationError("Pivot categories create duplicate output names.")
            generated[old_name] = new_name
        return result.rename(generated).lazy()
    if kind == "unpivot":
        return frame.unpivot(
            on=p["value_columns"], index=p["identifier_columns"],
            variable_name=p["attribute_name"], value_name=p["value_name"],
        )
    return frame
