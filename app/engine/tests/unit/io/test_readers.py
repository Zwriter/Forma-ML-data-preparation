import polars as pl
import pytest
from forma_engine.domain.errors import FileAccessError, InvalidDatasetError, UnsupportedFormatError
from forma_engine.io.readers import scan, schema_for, row_count

def test_reads_csv_schema(tmp_path):
    path = tmp_path / "x.csv"; path.write_text("a,b\n1,two\n")
    assert schema_for(scan(str(path)))[0]["name"] == "a"

def test_reads_parquet_schema(tmp_path):
    path = tmp_path / "x.parquet"; pl.DataFrame({"x": [1]}).write_parquet(path)
    assert schema_for(scan(str(path)))[0]["type"].startswith("Int")

def test_rejects_unsupported_format(tmp_path):
    path = tmp_path / "x.json"; path.write_text("{}")
    with pytest.raises(UnsupportedFormatError): scan(str(path))

def test_rejects_missing_file(tmp_path):
    with pytest.raises(FileAccessError): scan(str(tmp_path / "missing.csv"))

def test_rejects_empty_file(tmp_path):
    path = tmp_path / "empty.csv"; path.write_bytes(b"")
    with pytest.raises(InvalidDatasetError): scan(str(path))

def test_rejects_empty_schema(tmp_path):
    path = tmp_path / "empty.csv"; path.write_text("\n")
    with pytest.raises(InvalidDatasetError): scan(str(path))

def test_rejects_duplicate_column_names(tmp_path):
    path = tmp_path / "duplicate.csv"; path.write_text("x,x\n1,2\n")
    with pytest.raises(InvalidDatasetError): scan(str(path))

def test_large_csv_row_count_is_unknown(tmp_path):
    path = tmp_path / "large.csv"
    with path.open("wb") as source:
        source.write(b"x\n")
        source.seek(50 * 1024 * 1024)
        source.write(b"1")
    assert row_count(pl.LazyFrame({"x": [1]}), str(path)) is None
