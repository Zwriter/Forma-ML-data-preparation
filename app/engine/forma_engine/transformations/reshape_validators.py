from forma_engine.domain.errors import InvalidTransformationError


def validate_reshape(kind: str, params: dict, columns: list[str], schema=None) -> None:
    if kind == "group_by":
        groups, aggregations = params.get("group_columns"), params.get("aggregations")
        if (
            not isinstance(groups, list)
            or not groups
            or any(not isinstance(name, str) or name not in columns for name in groups)
            or len(set(groups)) != len(groups)
        ):
            raise InvalidTransformationError(
                "Choose one or more unique grouping columns."
            )
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
                raise InvalidTransformationError(
                    "Choose a supported summary calculation."
                )
            if function == "count":
                if column is not None and column not in columns:
                    raise InvalidTransformationError("Choose an existing count column.")
            elif not isinstance(column, str) or column not in columns:
                raise InvalidTransformationError("Choose an existing value column.")
            if not isinstance(output_name, str) or not output_name.strip():
                raise InvalidTransformationError(
                    "Enter a name for each summary column."
                )
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
            params.get("category_column"),
            params.get("value_column"),
            params.get("function"),
        )
        if (
            not isinstance(rows, list)
            or not rows
            or any(not isinstance(name, str) or name not in columns for name in rows)
            or len(set(rows)) != len(rows)
        ):
            raise InvalidTransformationError(
                "Choose one or more unique row label columns."
            )
        if not isinstance(category, str) or category not in columns:
            raise InvalidTransformationError("Choose an existing category column.")
        if not isinstance(value, str) or value not in columns:
            raise InvalidTransformationError("Choose an existing value column.")
        if category == value or category in rows or value in rows:
            raise InvalidTransformationError(
                "Row labels, category, and value roles must differ."
            )
        if function not in {"count", "sum", "average", "minimum", "maximum"}:
            raise InvalidTransformationError("Choose a supported pivot calculation.")
        if function in {"sum", "average"} and schema is not None:
            if not schema[value].is_numeric():
                raise InvalidTransformationError(
                    "Sum and average require numeric values."
                )
    if kind == "unpivot":
        identifiers, values = (
            params.get("identifier_columns"),
            params.get("value_columns"),
        )
        attribute, value = params.get("attribute_name"), params.get("value_name")
        if (
            not isinstance(identifiers, list)
            or not identifiers
            or any(
                not isinstance(name, str) or name not in columns for name in identifiers
            )
            or len(set(identifiers)) != len(identifiers)
        ):
            raise InvalidTransformationError(
                "Choose one or more unique identifier columns."
            )
        if (
            not isinstance(values, list)
            or not values
            or any(not isinstance(name, str) or name not in columns for name in values)
            or len(set(values)) != len(values)
            or set(values) & set(identifiers)
        ):
            raise InvalidTransformationError(
                "Choose unique value columns separate from identifiers."
            )
        if (
            not isinstance(attribute, str)
            or not attribute.strip()
            or not isinstance(value, str)
            or not value.strip()
        ):
            raise InvalidTransformationError(
                "Enter names for the attribute and value columns."
            )
        if attribute == value or attribute in columns or value in columns:
            raise InvalidTransformationError(
                "Generated column names must not match existing columns."
            )
