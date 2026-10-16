import polars as pl
import pytest

from forma_engine.domain.entities import Dataset
from forma_engine.domain.errors import SaveError, SaveRequiredError
from forma_engine.services.dataset_service import DatasetService
from forma_engine.services.save_service import SaveService


def open_source(tmp_path):
    source = tmp_path / "source.csv"
    source.write_text("name,value\nAda,1\nLinus,2\n", encoding="utf-8")
    datasets = DatasetService()
    opened = datasets.open(str(source))
    return datasets, opened, source


def test_save_replaces_source_with_current_working_state(tmp_path):
    datasets, opened, source = open_source(tmp_path)
    current = pl.DataFrame({"name": ["Grace"], "value": [3]}).lazy()
    schema = datasets.schema_service.inspect(current, "x")["schema"]
    derived = Dataset(opened["source_path"], "csv", schema, 1)
    datasets.register_derived(opened["dataset_id"], derived, current, {"type": "test"})

    result = SaveService(datasets).save(derived.dataset_id, True, lambda: False)

    assert result["destination"] == str(source.resolve())
    assert result["row_count"] == 1
    assert result["validated"] is True
    assert result["history"]["is_dirty"] is False
    assert pl.read_csv(source).to_dicts() == [{"name": "Grace", "value": 3}]


def test_save_requires_explicit_overwrite_confirmation(tmp_path):
    datasets, opened, _ = open_source(tmp_path)
    with pytest.raises(SaveRequiredError):
        SaveService(datasets).submit(
            type("Jobs", (), {"submit": lambda *_: pytest.fail("job queued")})(),
            opened["dataset_id"],
            False,
        )


def test_failed_save_preserves_saved_history_cursor(tmp_path, monkeypatch):
    datasets, opened, source = open_source(tmp_path)
    original_bytes = source.read_bytes()
    derived = Dataset(opened["source_path"], "csv", opened["schema"], opened["rows"])
    datasets.register_derived(
        opened["dataset_id"], derived, datasets.frame(opened["dataset_id"]), {"type": "test"}
    )

    def fail_write(*_args, **_kwargs):
        raise OSError("write failed")

    monkeypatch.setattr("forma_engine.services.save_service.write_safe", fail_write)
    with pytest.raises(SaveError):
        SaveService(datasets).save(derived.dataset_id, True, lambda: False)

    history = datasets.history(derived.dataset_id)
    assert history["saved_index"] == 0
    assert history["is_dirty"] is True
    assert source.read_bytes() == original_bytes
