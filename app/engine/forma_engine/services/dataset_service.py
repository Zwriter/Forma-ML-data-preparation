from dataclasses import dataclass, field
import polars as pl
from forma_engine.domain.entities import Dataset
from forma_engine.domain.errors import DatasetNotFoundError, RequestError
from forma_engine.io.readers import scan, schema_for
from forma_engine.io.schema_service import SchemaService

MAX_PREVIEW = 500


@dataclass
class DatasetService:
    datasets: dict[str, Dataset] = field(default_factory=dict)
    frames: dict[str, pl.LazyFrame] = field(default_factory=dict)
    schema_service: SchemaService = field(default_factory=SchemaService)

    def open(self, path: str) -> dict:
        frame = scan(path)
        metadata = self.schema_service.inspect(frame, path)
        dataset = Dataset(
            path, path.rsplit(".", 1)[-1].lower(), metadata["schema"], metadata["rows"]
        )
        self.datasets[dataset.dataset_id] = dataset
        self.frames[dataset.dataset_id] = frame
        return dataset.to_dict()

    def get(self, dataset_id: str) -> Dataset:
        dataset = self.datasets.get(dataset_id)
        if not dataset or dataset.state.value != "open":
            raise DatasetNotFoundError("Dataset is no longer available. Open it again.")
        return dataset

    def frame(self, dataset_id: str) -> pl.LazyFrame:
        self.get(dataset_id)
        return self.frames[dataset_id]

    def preview(
        self,
        dataset_id: str,
        offset: int = 0,
        limit: int = 100,
        columns: list[str] | None = None,
    ) -> dict:
        if not isinstance(offset, int) or isinstance(offset, bool) or offset < 0:
            raise RequestError("offset must be a non-negative integer")
        if not isinstance(limit, int) or isinstance(limit, bool) or limit <= 0:
            raise RequestError("limit must be a positive integer")
        frame = self.frame(dataset_id)
        names = frame.collect_schema().names()
        if columns is not None:
            if any(c not in names for c in columns):
                raise RequestError("Requested preview contains an unknown column")
            frame = frame.select(columns)
        data = frame.slice(offset, min(limit, MAX_PREVIEW)).collect()
        return {
            "dataset_id": dataset_id,
            "columns": schema_for(frame),
            "records": data.to_dicts(),
            "offset": offset,
            "limit": min(limit, MAX_PREVIEW),
            "total_count": self.get(dataset_id).rows,
        }
