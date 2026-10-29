import polars as pl
from forma_engine.domain.errors import InvalidTransformationError, CancelledError
from forma_engine.transformations.validators import validate
from forma_engine.transformations.operations import apply


def execute(
    frame: pl.LazyFrame, operations: list[dict], cancelled=lambda: False
) -> pl.LazyFrame:
    if not isinstance(operations, list) or any(
        not isinstance(operation, dict) for operation in operations
    ):
        raise InvalidTransformationError(
            "Transformations must be a list of operation objects."
        )
    orders = [
        operation.get("order", index) for index, operation in enumerate(operations)
    ]
    if any(
        not isinstance(order, int) or isinstance(order, bool) or order < 0
        for order in orders
    ) or len(set(orders)) != len(orders):
        raise InvalidTransformationError(
            "Transformation order values must be unique non-negative integers."
        )
    ids = [op["operation_id"] for op in operations if "operation_id" in op]
    if len(ids) != len(set(ids)):
        raise InvalidTransformationError("Operation IDs must be unique.")
    current = frame
    ordered = [
        item[1] for item in sorted(zip(orders, operations), key=lambda item: item[0])
    ]
    for operation in ordered:
        if cancelled():
            raise CancelledError("Cleaning was cancelled.")
        if not operation.get("enabled", True):
            continue
        schema = current.collect_schema()
        validate(operation, schema.names(), schema)
        if operation.get("type") == "fill_null" and operation.get("parameters", {}).get(
            "strategy"
        ) in {"mean", "median"}:
            column = operation["parameters"]["column"]
            if not current.collect_schema()[column].is_numeric():
                raise InvalidTransformationError(
                    "Mean and median fill require a numeric column."
                )
        if (
            operation.get("type") == "fill_null"
            and operation.get("parameters", {}).get("strategy") == "mode"
        ):
            column = operation["parameters"]["column"]
            values = current.select(pl.col(column).drop_nulls().len()).collect().item()
            if not values:
                raise InvalidTransformationError(
                    "Mode fill requires at least one non-missing value."
                )
        try:
            current = apply(current, operation)
        except InvalidTransformationError:
            raise
        except Exception as exc:
            raise InvalidTransformationError(
                f"{operation.get('type', 'Transformation')} could not be applied; "
                "the previous result is preserved."
            ) from exc
    return current
