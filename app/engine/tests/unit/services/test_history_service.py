import pytest

from forma_engine.domain.entities import Dataset
from forma_engine.domain.errors import RequestError
from forma_engine.services.history_service import HistoryService


def make_dataset(name):
    return Dataset(name, "csv", [], 0)


def test_open_starts_clean_history_and_registers_source_frame():
    history = HistoryService()
    dataset, frame = make_dataset("source.csv"), object()

    metadata = history.open(dataset, frame)

    assert metadata["dataset_id"] == dataset.dataset_id
    assert metadata["current_index"] == metadata["saved_index"] == 0
    assert metadata["is_dirty"] is False
    assert metadata["can_undo"] is False
    assert metadata["can_redo"] is False
    assert history.current(dataset.dataset_id).frame is frame


def test_commit_and_save_cursor_drive_dirty_and_undo_redo_state():
    history = HistoryService()
    source, first_frame = make_dataset("source.csv"), object()
    history.open(source, first_frame)
    first = make_dataset("derived-1")
    history.commit(source.dataset_id, first, object(), {"type": "filter_rows"})
    assert history.metadata(first.dataset_id)["is_dirty"] is True

    history.mark_saved(first.dataset_id)
    assert history.metadata(first.dataset_id)["is_dirty"] is False
    undone = history.move(first.dataset_id, "undo")
    assert undone.dataset is source
    assert history.metadata(source.dataset_id)["is_dirty"] is True
    redone = history.move(source.dataset_id, "redo")
    assert redone.dataset is first
    assert history.metadata(first.dataset_id)["is_dirty"] is False


def test_new_commit_after_undo_discards_redo_states():
    history = HistoryService()
    source = make_dataset("source.csv")
    history.open(source, object())
    first = make_dataset("derived-1")
    second = make_dataset("derived-2")
    history.commit(source.dataset_id, first, object(), {"type": "sort_rows"})
    history.commit(first.dataset_id, second, object(), {"type": "pivot"})
    history.mark_saved(second.dataset_id)
    history.move(second.dataset_id, "undo")
    replacement = make_dataset("replacement")

    metadata = history.commit(
        first.dataset_id, replacement, object(), {"type": "unpivot"}
    )

    assert metadata["can_redo"] is False
    assert metadata["is_dirty"] is True
    assert len(history.history_for(source.dataset_id).states) == 3


@pytest.mark.parametrize("direction", ["undo", "redo"])
def test_move_rejects_history_boundaries(direction):
    history = HistoryService()
    source = make_dataset("source.csv")
    history.open(source, object())
    with pytest.raises(RequestError):
        history.move(source.dataset_id, direction)
