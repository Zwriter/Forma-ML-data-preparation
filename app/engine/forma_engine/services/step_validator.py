import polars as pl

from forma_engine.domain.errors import FormaError
from forma_engine.io.readers import schema_for
from forma_engine.transformations.operations import apply
from forma_engine.transformations.validators import validate


class StepValidator:
    """Validate draft steps against the schema produced by preceding valid steps.

    Only schemas are resolved, so validation never reads dataset rows.
    ``columns[i]`` is the schema step ``i`` sees and the last entry is the schema
    after every step, so step forms can offer the columns that exist at that point.
    """

    def validate(self, frame: pl.LazyFrame, operations: list) -> dict:
        current, steps, columns = frame, [], []
        for index, operation in enumerate(operations):
            columns.append(schema_for(current))
            result = {"index": index, "valid": True}
            if isinstance(operation, dict) and "operation_id" in operation:
                result["operation_id"] = operation["operation_id"]
            if isinstance(operation, dict) and not operation.get("enabled", True):
                steps.append(result)
                continue
            try:
                schema = current.collect_schema()
                validate(operation, schema.names(), schema)
                candidate = apply(current, operation)
                candidate.collect_schema()
                current = candidate
            except FormaError as error:
                result |= {"valid": False, "message": error.message}
            except Exception:
                result |= {"valid": False, "message": "This step could not be checked."}
            steps.append(result)
        columns.append(schema_for(current))
        return {
            "valid": all(item["valid"] for item in steps),
            "steps": steps,
            "columns": columns,
        }
