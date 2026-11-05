import polars as pl

from forma_engine.domain.errors import InvalidTransformationError, RequestError
from forma_engine.io.readers import schema_for
from forma_engine.services.dataset_service import search_rows
from forma_engine.services.step_validator import StepValidator
from forma_engine.services.view_mask import SortKey, apply_view, carry_view
from forma_engine.transformations.executor import execute
from forma_engine.transformations.lineage import Lineage, initial_lineage, track

ROW_ID = "__forma_row_id__"
CHANGED = "__forma_changed__"


class CleaningPreviewer:
    """Run draft steps on the full frame and describe one worksheet page of the result.

    A hidden row id follows every row through the steps, so the page can keep removed
    rows in their source position and mark changed cells, while the summary covers
    every row.
    """

    def __init__(self, validator: StepValidator | None = None):
        self.validator = validator or StepValidator()

    def preview(
        self,
        frame: pl.LazyFrame,
        operations: list[dict],
        offset: int = 0,
        limit: int = 100,
        columns: list[str] | None = None,
        search: str | None = None,
        view: list[SortKey] | None = None,
    ) -> dict:
        """Steps run in stored order; the page lists source rows in view order."""
        view = view or []
        self._raise_first_invalid(frame, operations)
        names = frame.collect_schema().names()
        if columns is not None and any(name not in names for name in columns):
            raise RequestError("Requested preview contains an unknown column")
        source = frame.with_row_index(ROW_ID)
        result, lineage = self._run(source, names, operations)
        visible = self._visible(lineage, columns)
        changes = self._changes(source, result, lineage)
        matching, _ = search_rows(
            self._affected_first(apply_view(source, view), changes),
            columns if columns is not None else names,
            search,
        )
        page = matching.slice(offset, limit).collect()
        after = result.join(page.lazy().select(ROW_ID), on=ROW_ID, how="semi")
        rows, changed = self._rows(page, after.collect(), visible)
        schema = {column["name"]: column for column in schema_for(result.drop(ROW_ID))}
        return {
            "columns": [{**schema[name], "origin": origin} for name, origin in visible],
            "rows": rows,
            "changed_cells": changed,
            "offset": offset,
            "limit": limit,
            "total_count": matching.select(pl.len()).collect().item(),
            "summary": self._summary(source, result, lineage, changes),
            "view": carry_view(view, lineage),
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
    def _visible(lineage: Lineage, columns: list[str] | None):
        """Project the worksheet's visible source columns onto result columns.

        Columns added by steps have no source, so they are always shown, last.
        """
        if columns is None:
            return list(lineage.items())
        shown = [
            (name, origin)
            for wanted in columns
            for name, origin in lineage.items()
            if origin == wanted
        ]
        return shown + [
            (name, origin) for name, origin in lineage.items() if not origin
        ]

    @staticmethod
    def _rows(page: pl.DataFrame, after: pl.DataFrame, visible):
        survivors = after.rows_by_key(ROW_ID, named=True, unique=True)
        rows, changed = [], []
        for index, original in enumerate(page.iter_rows(named=True)):
            result = survivors.get(original[ROW_ID])
            if result is None:
                values = {
                    name: original[origin] if origin else None
                    for name, origin in visible
                }
                rows.append({"values": values, "removed": True})
                continue
            rows.append(
                {
                    "values": {name: result[name] for name, _ in visible},
                    "removed": False,
                }
            )
            changed += [
                {"row": index, "column": name, "before": original[origin]}
                for name, origin in visible
                if origin and _text(original[origin]) != _text(result[name])
            ]
        return rows, changed

    @staticmethod
    def _changes(source, result, lineage: Lineage) -> pl.LazyFrame:
        """Per source row: how many visible cells the steps changed; null if removed."""
        pairs = [(name, origin) for name, origin in lineage.items() if origin]
        left = source.select(ROW_ID, *(origin for _, origin in pairs))
        right = result.select(
            ROW_ID,
            *(pl.col(name).alias(f"{name}__after") for name, _ in pairs),
            pl.lit(True).alias("__kept"),
        )
        differences = [
            pl.col(origin)
            .cast(pl.String)
            .ne_missing(pl.col(f"{name}__after").cast(pl.String))
            .cast(pl.Int64)
            for name, origin in pairs
        ]
        changed = pl.sum_horizontal(differences) if differences else pl.lit(0)
        joined = left.join(right, on=ROW_ID, how="left")
        counts = pl.when(pl.col("__kept").is_null()).then(None).otherwise(changed)
        # Collected once: the page order and the summary both read it.
        return joined.select(ROW_ID, counts.alias(CHANGED)).collect().lazy()

    @staticmethod
    def _affected_first(rows: pl.LazyFrame, changes: pl.LazyFrame) -> pl.LazyFrame:
        """Put changed and removed rows first; each group keeps its current order."""
        affected = pl.col(CHANGED).is_null() | (pl.col(CHANGED) > 0)
        flags = changes.select(ROW_ID, affected.alias("__affected"))
        return (
            rows.join(flags, on=ROW_ID, how="left", maintain_order="left")
            .sort("__affected", descending=True, maintain_order=True)
            .drop("__affected")
        )

    @staticmethod
    def _summary(source, result, lineage: Lineage, changes: pl.LazyFrame):
        rows_before = source.select(pl.len()).collect().item()
        rows_after = result.select(pl.len()).collect().item()
        values_changed = changes.select(pl.col(CHANGED).sum()).collect().item() or 0
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
