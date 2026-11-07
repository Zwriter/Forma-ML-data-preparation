import time

import polars as pl

from forma_engine.domain.entities import Dataset
from forma_engine.jobs.manager import JobManager
from forma_engine.profiling.statistics import profile
from forma_engine.services.dataset_service import DatasetService
from forma_engine.services.profile_service import ProfileService


class Publisher:
    def publish(self, event):
        pass


def _wide_frame(rows: int) -> pl.LazyFrame:
    """25 columns: integers, decimals with gaps, text categories, booleans and numbers
    stored as text."""
    i = pl.int_range(0, rows, eager=False)
    columns = []
    for n in range(5):
        columns += [
            ((i * (n + 7)) % 10_007).alias(f"int_{n}"),
            pl.when(i % 13 == n).then(None).otherwise(i * 0.25).alias(f"dec_{n}"),
            pl.format("cat_{}", i % (5 + n)).alias(f"text_{n}"),
            (i % 2 == 0).alias(f"flag_{n}"),
            pl.format("{}", i % 1000).alias(f"numtext_{n}"),
        ]
    return pl.select(columns).lazy()


def _opened(frame: pl.LazyFrame) -> tuple[DatasetService, str]:
    datasets = DatasetService()
    schema = [
        {"name": name, "type": str(dtype), "nullable": True}
        for name, dtype in frame.collect_schema().items()
    ]
    dataset = Dataset("generated://wide", "parquet", schema, None)
    datasets.datasets[dataset.dataset_id] = dataset
    datasets.frames[dataset.dataset_id] = frame
    datasets.history_service.open(dataset, frame)
    return datasets, dataset.dataset_id


def _state(jobs: JobManager, job_id: str) -> str:
    return jobs.status(job_id)["state"]


def test_profiles_100k_rows_by_25_columns_within_5_seconds():
    frame = _wide_frame(100_000)
    started = time.perf_counter()
    result = profile(frame, "perf", "h", "v1")
    elapsed = time.perf_counter() - started

    assert result["row_count"] == 100_000
    assert result["column_count"] == 25
    assert elapsed < 5  # SC-001


def test_cancelling_a_10m_row_profile_takes_effect_within_2_seconds():
    datasets, dataset_id = _opened(_wide_frame(10_000_000))
    jobs = JobManager(Publisher())
    service = ProfileService(datasets, jobs)
    job_id = service.submit(dataset_id)["job_id"]
    while _state(jobs, job_id) != "running":
        time.sleep(0.01)
    time.sleep(1)  # well inside the first long query

    requested = time.perf_counter()
    jobs.cancel(job_id)
    while _state(jobs, job_id) == "running":
        assert time.perf_counter() - requested < 2  # SC-002
        time.sleep(0.01)

    assert _state(jobs, job_id) == "cancelled"
    jobs.shutdown()  # the worker stops at its next query and drops its work
    assert _state(jobs, job_id) == "cancelled"
    assert service.latest(datasets.history_id(dataset_id)) is None
