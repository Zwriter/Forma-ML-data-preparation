import polars as pl
import pytest

from forma_engine.domain.errors import (
    CancelledError,
    FileAccessError,
    ProfileStaleError,
    RequestError,
)
from forma_engine.services.dataset_service import DatasetService
from forma_engine.services.invalid_rows_service import InvalidRowsService


class InlineJobs:
    def submit(self, kind, work):
        self.kind = kind
        return work(lambda: False)


@pytest.fixture
def opened(tmp_path, mixed_frame, write_csv):
    path = write_csv(mixed_frame, "mixed.csv")
    datasets = DatasetService()
    dataset_id = datasets.open(str(path))["dataset_id"]
    return datasets, dataset_id, path, InvalidRowsService(datasets)


def submit(opened, destination, column=None, version=None, fmt="csv"):
    datasets, dataset_id, _, service = opened
    version = version or datasets.data_version(dataset_id)
    jobs = InlineJobs()
    result = service.submit(
        jobs, dataset_id, version, column, str(destination), fmt, False
    )
    return jobs, result


def test_exports_invalid_rows_and_leaves_the_dataset_alone(opened, tmp_path):
    datasets, dataset_id, source, _ = opened
    before = (source.read_bytes(), datasets.history(dataset_id))

    jobs, result = submit(opened, tmp_path / "rejected.csv")

    assert jobs.kind == "export_invalid"
    assert result["row_count"] == 2 and result["reason_column"] == "reject_reason_1"
    written = pl.read_csv(tmp_path / "rejected.csv")
    assert written["id"].to_list() == [3, 10]
    assert (source.read_bytes(), datasets.history(dataset_id)) == before


def test_one_column_and_parquet(opened, tmp_path):
    _, result = submit(
        opened, tmp_path / "amount.parquet", column="amount", fmt="parquet"
    )
    assert result["row_count"] == 2
    assert pl.read_parquet(tmp_path / "amount.parquet").height == 2


def test_guards_stale_versions_the_source_file_and_empty_exports(opened, tmp_path):
    _, _, source, _ = opened
    with pytest.raises(ProfileStaleError):
        submit(opened, tmp_path / "x.csv", version="old")
    with pytest.raises(FileAccessError, match="open source file"):
        submit(opened, source)
    with pytest.raises(RequestError, match="no invalid values"):
        submit(opened, tmp_path / "x.csv", column="price")
    with pytest.raises(RequestError):
        submit(opened, tmp_path / "x.csv", column="missing_column")
    assert not (tmp_path / "x.csv").exists()


def test_cancel_leaves_no_file(opened, tmp_path):
    datasets, dataset_id, _, service = opened
    version = datasets.data_version(dataset_id)
    with pytest.raises(CancelledError):
        service.export(
            dataset_id,
            version,
            None,
            str(tmp_path / "c.csv"),
            "csv",
            False,
            lambda: True,
        )
    assert list(tmp_path.glob("c.csv*")) == []
