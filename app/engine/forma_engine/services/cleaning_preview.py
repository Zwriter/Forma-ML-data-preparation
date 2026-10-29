import polars as pl

from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.io.readers import schema_for
from forma_engine.services.step_validator import StepValidator
from forma_engine.transformations.executor import execute
from forma_engine.transformations.lineage import Lineage, initial_lineage, track

ROW_ID = "__forma_row_id__"


class CleaningPreviewer:
    """Run draft steps on the full frame and describe their effect.

    A hidden row id follows every row through the steps, so the bounded sample can
    mark removed rows and changed cells, while the summary covers every row.
    """

    def __init__(self, limit: int = 100, validator: StepValidator | None = None):
        self.limit = limit
        self.validator = validator or StepValidator()

    def preview(self, frame: pl.LazyFrame, operations: list[dict]) -> dict:
        self._raise_first_invalid(frame, operations)
        source = frame.with_row_index(ROW_ID)
        result, lineage = self._run(source, frame.collect_schema().names(), operations)
        before = source.limit(self.limit).collect()
        after = result.filter(pl.col(ROW_ID) < self.limit).collect()
        removed, changed = self._markers(before, after, lineage)
        return {
            "columns_before": schema_for(frame),
            "columns": schema_for(result.drop(ROW_ID)),
            "before": before.drop(ROW_ID).to_dicts(),
            "after": after.drop(ROW_ID).to_dicts(),
            "removed_rows": removed,
            "changed_cells": changed,
            "summary": self._summary(source, result, lineage),
            "validation": {"valid": True},
        }

    def _raise_first_invalid(self, frame, operations):
        for step in self.validator.validate(frame, operations)["steps"]:
            if not step["valid"]:
                self._raise(step["index"], step["message"])

    @staticmethod
    def _raise(index: int, message: str):
        raise InvalidTransformationError(
            f"Step {index + 1}: {message}", {"step": index}
        )

    def _run(self, source, columns, operations) -> tuple[pl.LazyFrame, Lineage]:
        current, lineage = source, initial_lineage(columns)
        for index, operation in enumerate(operations):
            if not operation.get("enabled", True):
                continue
            prepared = self._prepare(operation, list(lineage))
            try:
                current = execute(current, [prepared])
            except InvalidTransformationError as error:
                self._raise(index, error.message)
            lineage = track(lineage, operation)
        return current, lineage

    @staticmethod
    def _prepare(operation: dict, columns: list[str]) -> dict:
        """Keep the row id out of whole-row duplicate comparison."""
        parameters = operation.get("parameters", {})
        if operation["type"] == "drop_duplicates" and not parameters.get("columns"):
            return {**operation, "parameters": {**parameters, "columns": columns}}
        return operation

    @staticmethod
    def _markers(before: pl.DataFrame, after: pl.DataFrame, lineage: Lineage):
        kept = set(after[ROW_ID].to_list())
        removed = [i for i, row_id in enumerate(before[ROW_ID]) if row_id not in kept]
        originals = before.rows_by_key(ROW_ID, named=True, unique=True)
        changed = []
        for index, row in enumerate(after.iter_rows(named=True)):
            original = originals[row[ROW_ID]]
            for column, origin in lineage.items():
                if origin and _text(original[origin]) != _text(row[column]):
                    changed.append({"row": index, "column": column})
        return removed, changed

    @staticmethod
    def _summary(source: pl.LazyFrame, result: pl.LazyFrame, lineage: Lineage):
        rows_before = source.select(pl.len()).collect().item()
        rows_after = result.select(pl.len()).collect().item()
        pairs = [(name, origin) for name, origin in lineage.items() if origin]
        values_changed = 0
        if pairs:
            left = source.select(ROW_ID, *(origin for _, origin in pairs))
            right = result.select(
                ROW_ID, *(pl.col(name).alias(f"{name}__after") for name, _ in pairs)
            )
            differences = [
                pl.col(origin)
                .cast(pl.String)
                .ne_missing(pl.col(f"{name}__after").cast(pl.String))
                .sum()
                for name, origin in pairs
            ]
            joined = left.join(right, on=ROW_ID).select(pl.sum_horizontal(differences))
            values_changed = joined.collect().item() or 0
        origins = set(lineage.values())
        return {
            "rows_before": rows_before,
            "rows_after": rows_after,
            "rows_removed": rows_before - rows_after,
            "values_changed": values_changed,
            "columns_added": [name for name, origin in lineage.items() if not origin],
            "columns_removed": [
                name
                for name in source.collect_schema().names()
                if name != ROW_ID and name not in origins
            ],
            "columns_renamed": [
                {"from": origin, "to": name}
                for name, origin in lineage.items()
                if origin and origin != name
            ],
        }


def _text(value):
    return None if value is None else str(value)
