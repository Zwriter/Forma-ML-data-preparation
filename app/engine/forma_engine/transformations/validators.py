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
            if (
                not isinstance(key.get("direction"), str)
                or key.get("direction") not in {"ascending", "descending"}
            ):
                raise InvalidTransformationError(
                    "Choose ascending or descending order."
                )
            if (
                not isinstance(key.get("nulls"), str)
                or key.get("nulls") not in {"first", "last"}
            ):
                raise InvalidTransformationError(
                    "Choose where missing values appear."
                )
    if kind == "group_by":
        groups, aggregations = params.get("group_columns"), params.get("aggregations")
        if not isinstance(groups, list) or not groups or any(
            not isinstance(name, str) or name not in columns for name in groups
        ) or len(set(groups)) != len(groups):
            raise InvalidTransformationError("Choose one or more unique grouping columns.")
        if not isinstance(aggregations, list) or not aggregations:
            raise InvalidTransformationError("Add at least one summary calculation.")
        output_names = set(groups)
        for aggregation in aggregations:
            if not isinstance(aggregation, dict):
                raise InvalidTransformationError("Configure each summary calculation.")
            function = aggregation.get("function")
            column = aggregation.get("column")
            output_name = aggregation.get("output_name")
            if function not in {"count", "sum", "average", "minimum", "maximum"}:
                raise InvalidTransformationError("Choose a supported summary calculation.")
            if function == "count":
                if column is not None and column not in columns:
                    raise InvalidTransformationError("Choose an existing count column.")
            elif not isinstance(column, str) or column not in columns:
                raise InvalidTransformationError("Choose an existing value column.")
            if not isinstance(output_name, str) or not output_name.strip():
                raise InvalidTransformationError("Enter a name for each summary column.")
            if output_name in output_names:
                raise InvalidTransformationError("Summary column names must be unique.")
            output_names.add(output_name)
            if function in {"sum", "average"} and schema is not None:
                if not schema[column].is_numeric():
                    raise InvalidTransformationError(
                        "Sum and average require numeric value columns."
                    )
    if kind == "pivot":
        rows = params.get("row_columns")
        category, value, function = (
            params.get("category_column"), params.get("value_column"), params.get("function")
        )
        if not isinstance(rows, list) or not rows or any(
            not isinstance(name, str) or name not in columns for name in rows
        ) or len(set(rows)) != len(rows):
            raise InvalidTransformationError("Choose one or more unique row label columns.")
        if not isinstance(category, str) or category not in columns:
            raise InvalidTransformationError("Choose an existing category column.")
        if not isinstance(value, str) or value not in columns:
            raise InvalidTransformationError("Choose an existing value column.")
        if category == value or category in rows or value in rows:
            raise InvalidTransformationError("Row labels, category, and value roles must differ.")
        if function not in {"count", "sum", "average", "minimum", "maximum"}:
            raise InvalidTransformationError("Choose a supported pivot calculation.")
        if function in {"sum", "average"} and schema is not None:
            if not schema[value].is_numeric():
                raise InvalidTransformationError("Sum and average require numeric values.")
    if kind == "unpivot":
        identifiers, values = params.get("identifier_columns"), params.get("value_columns")
        attribute, value = params.get("attribute_name"), params.get("value_name")
        if not isinstance(identifiers, list) or not identifiers or any(
            not isinstance(name, str) or name not in columns for name in identifiers
        ) or len(set(identifiers)) != len(identifiers):
            raise InvalidTransformationError("Choose one or more unique identifier columns.")
        if not isinstance(values, list) or not values or any(
            not isinstance(name, str) or name not in columns for name in values
        ) or len(set(values)) != len(values) or set(values) & set(identifiers):
            raise InvalidTransformationError("Choose unique value columns separate from identifiers.")
        if not isinstance(attribute, str) or not attribute.strip() or not isinstance(value, str) or not value.strip():
            raise InvalidTransformationError("Enter names for the attribute and value columns.")
        if attribute == value or attribute in columns or value in columns:
            raise InvalidTransformationError("Generated column names must not match existing columns.")
