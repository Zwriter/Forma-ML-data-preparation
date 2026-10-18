from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.filter_parser import parse_filter
from forma_engine.transformations.reshape_validators import validate_reshape

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


def validate(operation: dict, columns: list[str], schema=None) -> None:
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
        if "expression" in params:
            parse_filter(params.get("expression"), columns)
        else:
            rules, mode = params.get("rules"), params.get("mode")
            if (
                not isinstance(mode, str)
                or mode not in {"all", "any"}
                or not isinstance(rules, list)
                or not rules
            ):
                raise InvalidTransformationError(
                    "Add filter conditions and choose all or any."
                )
            operators = {
                "equals",
                "not_equals",
                "contains",
                "begins_with",
                "ends_with",
                "greater_than",
                "less_than",
                "at_least",
                "at_most",
                "is_empty",
                "is_not_empty",
            }
            for rule in rules:
                if (
                    not isinstance(rule, dict)
                    or not isinstance(rule.get("column"), str)
                    or rule.get("column") not in columns
                ):
                    raise InvalidTransformationError(
                        "Choose an existing column for each condition."
                    )
                if (
                    not isinstance(rule.get("operator"), str)
                    or rule.get("operator") not in operators
                ):
                    raise InvalidTransformationError(
                        "Choose a supported filter condition."
                    )
                if rule["operator"] not in {"is_empty", "is_not_empty"} and (
                    "value" not in rule or rule["value"] is None
                ):
                    raise InvalidTransformationError(
                        "Enter a comparison value for each condition."
                    )
                if "value" in rule and not isinstance(
                    rule["value"], (str, int, float, bool)
                ):
                    raise InvalidTransformationError(
                        "Filter values must be simple typed values."
                    )
                if "case_sensitive" in rule and not isinstance(
                    rule["case_sensitive"], bool
                ):
                    raise InvalidTransformationError(
                        "case_sensitive must be a boolean."
                    )
    if kind == "sort_rows":
        keys = params.get("keys")
        if not isinstance(keys, list) or not keys:
            raise InvalidTransformationError("Add at least one sort column.")
        seen = set()
        for key in keys:
            if (
                not isinstance(key, dict)
                or not isinstance(key.get("column"), str)
                or key.get("column") not in columns
            ):
                raise InvalidTransformationError(
                    "Choose an existing column for each sort key."
                )
            if key["column"] in seen:
                raise InvalidTransformationError(
                    "Each sort column can appear only once."
                )
            seen.add(key["column"])
            if not isinstance(key.get("direction"), str) or key.get(
                "direction"
            ) not in {"ascending", "descending"}:
                raise InvalidTransformationError(
                    "Choose ascending or descending order."
                )
            if not isinstance(key.get("nulls"), str) or key.get("nulls") not in {
                "first",
                "last",
            }:
                raise InvalidTransformationError("Choose where missing values appear.")
    if kind in {"group_by", "pivot", "unpivot"}:
        validate_reshape(kind, params, columns, schema)
