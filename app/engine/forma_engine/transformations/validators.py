from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.filter_parser import parse_filter

SUPPORTED = {
    "drop_duplicates",
    "drop_null_rows",
    "fill_null",
    "rename_columns",
    "drop_columns",
    "convert_type",
    "filter_rows",
    "sort_rows",
    "group_by",
    "pivot",
    "unpivot",
}


def validate(operation: dict, columns: list[str]) -> None:
    if not isinstance(operation, dict):
        raise InvalidTransformationError("Each transformation must be an object.")
    kind, params = operation.get("type"), operation.get("parameters", {})
    if kind not in SUPPORTED or not isinstance(params, dict):
        raise InvalidTransformationError(
            "Choose a supported transformation with valid parameters."
        )
    if "enabled" in operation and not isinstance(operation["enabled"], bool):
        raise InvalidTransformationError("enabled must be a boolean.")
    if "order" in operation and (
        not isinstance(operation["order"], int)
        or isinstance(operation["order"], bool)
        or operation["order"] < 0
    ):
        raise InvalidTransformationError("order must be a non-negative integer.")
    if kind in {"fill_null", "convert_type"} and params.get("column") not in columns:
        raise InvalidTransformationError("Select an existing column.")
    if kind == "fill_null":
        strategy = params.get("strategy")
        if strategy not in {"constant", "mean", "median", "mode"}:
            raise InvalidTransformationError("Choose constant, mean, median, or mode.")
        if strategy == "constant" and "value" not in params:
            raise InvalidTransformationError(
                "Constant fill requires a replacement value."
            )
        if strategy in {"mean", "median"} and params["column"] not in columns:
            raise InvalidTransformationError(
                "Select a numeric column for mean or median fill."
            )
    if kind == "rename_columns":
        mapping = params.get("mapping")
        if not isinstance(mapping, dict) or any(
            k not in columns or not isinstance(v, str) or not v.strip()
            for k, v in mapping.items()
        ):
            raise InvalidTransformationError(
                "Provide valid existing column names and non-empty replacements."
            )
        final_names = [mapping.get(name, name) for name in columns]
        if len(set(final_names)) != len(final_names):
            raise InvalidTransformationError("Renamed columns must be unique.")
    if kind == "drop_columns":
        dropped = params.get("columns")
        if not isinstance(dropped, list) or any(c not in columns for c in dropped):
            raise InvalidTransformationError("Select existing columns to drop.")
        if len(dropped) >= len(columns):
            raise InvalidTransformationError(
                "A dataset must retain at least one column."
            )
    if kind in {"drop_duplicates", "drop_null_rows"} and "columns" in params:
        selected = params["columns"]
        if not isinstance(selected, list) or any(
            not isinstance(name, str) or name not in columns for name in selected
        ):
            raise InvalidTransformationError(
                "Select existing columns for this operation."
            )
    if kind == "convert_type" and params.get("to") not in {
        "string",
        "integer",
        "float",
        "boolean",
        "date",
    }:
        raise InvalidTransformationError("Choose a supported conversion type.")
    if kind == "filter_rows":
        parse_filter(params.get("expression"), columns)
    if kind in {"sort_rows", "group_by", "pivot", "unpivot"}:
        required = {
            "sort_rows": ("keys",),
            "group_by": ("group_columns", "aggregations"),
            "pivot": ("row_columns", "category_column", "value_column", "function"),
            "unpivot": ("identifier_columns", "value_columns", "attribute_name", "value_name"),
        }[kind]
        if any(key not in params for key in required):
            raise InvalidTransformationError("Provide all required operation settings.")
