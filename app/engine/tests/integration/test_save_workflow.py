import polars as pl
import pytest

from forma_engine.domain.entities import Dataset
from forma_engine.domain.errors import SaveError, SaveRequiredError
from forma_engine.services.data_operation_service import DataOperationService
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


def test_save_copy_writes_destination_and_preserves_source(tmp_path):
    datasets, opened, source = open_source(tmp_path)
    original = source.read_bytes()
    destination = tmp_path / "copy.csv"
    current = pl.DataFrame({"name": ["Grace"], "value": [3]}).lazy()
    schema = datasets.schema_service.inspect(current, "copy")["schema"]
    derived = Dataset(opened["source_path"], "csv", schema, 1)
    datasets.register_derived(opened["dataset_id"], derived, current, {"type": "test"})

    result = SaveService(datasets).save(
        derived.dataset_id, False, lambda: False, str(destination)
    )

    assert result["destination"] == str(destination.resolve())
    assert source.read_bytes() == original
    assert pl.read_csv(destination).to_dicts() == [{"name": "Grace", "value": 3}]
    assert result["history"]["is_dirty"] is False


def test_save_requires_explicit_overwrite_confirmation(tmp_path):
    datasets, opened, _ = open_source(tmp_path)
    derived = Dataset(opened["source_path"], "csv", opened["schema"], 2)
    changed = datasets.frame(opened["dataset_id"]).select(pl.all())
    datasets.register_derived(opened["dataset_id"], derived, changed, {"type": "test"})
    with pytest.raises(SaveRequiredError):
        SaveService(datasets).submit(
            type("Jobs", (), {"submit": lambda *_: pytest.fail("job queued")})(),
            derived.dataset_id,
            False,
        )


def test_save_copy_requires_confirmation_when_destination_exists(tmp_path):
    datasets, opened, _ = open_source(tmp_path)
    destination = tmp_path / "copy.csv"
    destination.write_text("old,data\nvalue,1\n", encoding="utf-8")

    with pytest.raises(SaveRequiredError, match="destination file"):
        SaveService(datasets).submit(
            type("Jobs", (), {"submit": lambda *_: pytest.fail("job queued")})(),
            opened["dataset_id"],
            False,
            str(destination),
        )


def test_failed_save_preserves_saved_history_cursor(tmp_path, monkeypatch):
    datasets, opened, source = open_source(tmp_path)
    original_bytes = source.read_bytes()
    derived = Dataset(opened["source_path"], "csv", opened["schema"], opened["rows"])
    datasets.register_derived(
        opened["dataset_id"],
        derived,
        datasets.frame(opened["dataset_id"]).select(pl.all()),
        {"type": "test"},
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


def sort_by_name(datasets, dataset_id):
    keys = [{"column": "name", "direction": "descending", "nulls": "last"}]
    operation = {"type": "sort_rows", "parameters": {"keys": keys}}
    result = DataOperationService(datasets).apply(dataset_id, operation, lambda: False)
    return result["dataset"]["dataset_id"]


class RecordingJobs:
    def submit(self, kind, work):
        self.work = work
        return {"job_id": "save", "state": "pending"}


def test_view_only_change_saves_without_writing_or_confirmation(tmp_path):
    datasets, opened, source = open_source(tmp_path)
    original = source.read_bytes()
    sorted_id = sort_by_name(datasets, opened["dataset_id"])
    jobs = RecordingJobs()

    SaveService(datasets).submit(jobs, sorted_id, False)
    result = jobs.work(lambda: False)

    assert result["rewritten"] is False
    assert result["destination"] == str(source.resolve())
    assert result["row_count"] == 2
    assert result["history"]["is_dirty"] is False
    assert source.read_bytes() == original


def test_data_change_reports_rewritten(tmp_path):
    datasets, opened, source = open_source(tmp_path)
    current = pl.DataFrame({"name": ["Grace"], "value": [3]}).lazy()
    derived = Dataset(opened["source_path"], "csv", opened["schema"], 1)
    datasets.register_derived(opened["dataset_id"], derived, current, {"type": "test"})

    result = SaveService(datasets).save(derived.dataset_id, True, lambda: False)

    assert result["rewritten"] is True


def test_view_only_save_to_a_new_copy_still_writes(tmp_path):
    datasets, opened, _ = open_source(tmp_path)
    sorted_id = sort_by_name(datasets, opened["dataset_id"])
    destination = tmp_path / "copy.csv"

    result = SaveService(datasets).save(
        sorted_id, False, lambda: False, str(destination)
    )

    assert result["rewritten"] is True
    assert pl.read_csv(destination)["name"].to_list() == ["Ada", "Linus"]


def test_source_is_written_when_only_a_copy_holds_the_data(tmp_path):
    datasets, opened, source = open_source(tmp_path)
    current = pl.DataFrame({"name": ["Grace"], "value": [3]}).lazy()
    derived = Dataset(opened["source_path"], "csv", opened["schema"], 1)
    datasets.register_derived(opened["dataset_id"], derived, current, {"type": "test"})
    saves = SaveService(datasets)
    saves.save(derived.dataset_id, False, lambda: False, str(tmp_path / "copy.csv"))
    sorted_id = sort_by_name(datasets, derived.dataset_id)

    with pytest.raises(SaveRequiredError):
        saves.submit(RecordingJobs(), sorted_id, False)
    result = saves.save(sorted_id, True, lambda: False)

    assert result["rewritten"] is True
    assert pl.read_csv(source)["name"].to_list() == ["Grace"]
