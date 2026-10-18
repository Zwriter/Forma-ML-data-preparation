import json
import time
import polars as pl
from forma_engine.domain.entities import Dataset
from forma_engine.services.dataset_service import DatasetService


def test_billion_row_lazy_preview_stays_bounded():
    service = DatasetService()
    dataset = Dataset(
        "generated://one-billion",
        "parquet",
        [{"name": "value", "type": "Int64", "nullable": False}],
        None,
    )
    service.datasets[dataset.dataset_id] = dataset
    service.frames[dataset.dataset_id] = pl.select(
        pl.int_range(0, 1_000_000_000).alias("value")
    ).lazy()
    service.history_service.open(dataset, service.frames[dataset.dataset_id])
    started = time.perf_counter()
    result = service.preview(
        dataset.dataset_id, offset=1000, limit=10_000, columns=["value"]
    )
    elapsed = time.perf_counter() - started
    assert len(result["records"]) == 500
    assert result["limit"] == 500
    assert [column["name"] for column in result["columns"]] == ["value"]
    assert len(json.dumps(result["records"])) < 20_000
    assert result["total_count"] is None
    assert elapsed < 5
