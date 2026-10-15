import polars as pl
import pytest

from forma_engine.domain.errors import (
    FileAccessError,
    InvalidDatasetError,
    UnsupportedFormatError,
)
from forma_engine.io.readers import row_count, scan, schema_for


def test_reads_csv_schema(tmp_path):
    path = tmp_path / "sample.csv"
    path.write_text("name,age\nAda,37\n", encoding="utf-8")

    schema = schema_for(scan(str(path)))

    assert [column["name"] for column in schema] == ["name", "age"]
    assert schema[0]["type"] == "String"
    assert schema[0]["nullable"] is True


def test_reads_parquet_schema(tmp_path):
    path = tmp_path / "sample.parquet"
    pl.DataFrame({"age": [37]}).write_parquet(path)

    assert schema_for(scan(str(path)))[0]["type"].startswith("Int")


def test_rejects_unsupported_format(tmp_path):
    path = tmp_path / "sample.json"
    path.write_text("{}", encoding="utf-8")

    with pytest.raises(UnsupportedFormatError, match="CSV or Parquet"):
        scan(str(path))


def test_rejects_missing_file(tmp_path):
    with pytest.raises(FileAccessError, match="does not exist"):
        scan(str(tmp_path / "missing.csv"))


def test_rejects_unreadable_file(tmp_path, monkeypatch):
    path = tmp_path / "unreadable.csv"
    path.write_text("x\n1\n", encoding="utf-8")
    original_open = type(path).open

    def deny_read(file_path, *args, **kwargs):
        if file_path == path and args and args[0] == "rb":
            raise PermissionError("access denied")
        return original_open(file_path, *args, **kwargs)

    monkeypatch.setattr(type(path), "open", deny_read)

    with pytest.raises(FileAccessError, match="cannot be read"):
        scan(str(path))


def test_rejects_empty_file(tmp_path):
    path = tmp_path / "empty.csv"
    path.write_bytes(b"")

    with pytest.raises(InvalidDatasetError, match="empty"):
        scan(str(path))


@pytest.mark.parametrize("contents", ["\n", "x,,y\n1,2,3\n"])
def test_rejects_empty_schema_or_column_name(tmp_path, contents):
    path = tmp_path / "invalid-schema.csv"
    path.write_text(contents, encoding="utf-8")

    with pytest.raises(InvalidDatasetError, match="Column names"):
        scan(str(path))


def test_rejects_duplicate_column_names(tmp_path):
    path = tmp_path / "duplicate.csv"
    path.write_text("x,x\n1,2\n", encoding="utf-8")

    with pytest.raises(InvalidDatasetError, match="unique"):
        scan(str(path))


def test_large_csv_row_count_is_unknown(tmp_path):
    path = tmp_path / "large.csv"
    with path.open("wb") as source:
        source.write(b"x\n")
        source.seek(50 * 1024 * 1024)
        source.write(b"1")

    assert row_count(pl.LazyFrame({"x": [1]}), str(path)) is None


def test_row_count_is_reported_for_small_dataset(tmp_path):
    path = tmp_path / "small.csv"
    path.write_text("x\n1\n2\n", encoding="utf-8")

    assert row_count(scan(str(path)), str(path)) == 2
