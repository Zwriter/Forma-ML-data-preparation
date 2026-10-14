import polars as pl
import pytest
from forma_engine.domain.errors import FileAccessError
from forma_engine.io.writers import write_safe


def test_writer_requires_explicit_overwrite(tmp_path):
    target = tmp_path / "out.csv"
    target.write_text("old\n")
    with pytest.raises(FileAccessError):
        write_safe(pl.DataFrame({"x": [1]}).lazy(), str(target), "csv", False)


@pytest.mark.parametrize("fmt", ["csv", "parquet"])
def test_writer_creates_readable_validated_output(tmp_path, fmt):
    target = tmp_path / f"out.{fmt}"
    result = write_safe(pl.DataFrame({"x": [1, 2]}).lazy(), str(target), fmt, False)
    reopened = pl.read_csv(target) if fmt == "csv" else pl.read_parquet(target)
    assert result["validated"] is True
    assert result["row_count"] == 2
    assert result["schema"][0]["name"] == "x"
    assert reopened["x"].to_list() == [1, 2]


def test_writer_reports_replacement_only_after_confirmed_overwrite(tmp_path):
    target = tmp_path / "out.csv"
    target.write_text("x\nold\n")
    result = write_safe(pl.DataFrame({"x": [1]}).lazy(), str(target), "csv", True)
    assert result["replaced_existing"] is True


def test_cancelled_writer_removes_temporary_output(tmp_path):
    target = tmp_path / "out.csv"
    checks = iter([False, True])
    with pytest.raises(InterruptedError):
        write_safe(
            pl.DataFrame({"x": [1]}).lazy(),
            str(target),
            "csv",
            False,
            lambda: next(checks),
        )
    assert not target.exists()
    assert list(tmp_path.glob(".forma-*")) == []
