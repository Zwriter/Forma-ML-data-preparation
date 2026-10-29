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


def test_history_keeps_only_last_ten_actions_and_allows_ten_undos():
    history = HistoryService()
    dataset = make_dataset("source.csv")
    history.open(dataset, object())

    for index in range(1, 13):
        next_dataset = make_dataset(f"derived-{index}")
        history.commit(dataset.dataset_id, next_dataset, object(), {"step": index})
        dataset = next_dataset

    metadata = history.metadata(dataset.dataset_id)
    assert len(history.history_for(dataset.dataset_id).states) == 11
    assert metadata["current_index"] == 10
    assert metadata["can_undo"] is True

    for _ in range(10):
        history.move(dataset.dataset_id, "undo")

    assert history.current(dataset.dataset_id).dataset.source_path == "derived-2"
    with pytest.raises(RequestError):
        history.move(dataset.dataset_id, "undo")


def test_pruned_saved_state_stays_dirty_until_new_save():
    history = HistoryService()
    dataset = make_dataset("source.csv")
    history.open(dataset, object())
    history.mark_saved(dataset.dataset_id)

    for index in range(1, 12):
        next_dataset = make_dataset(f"derived-{index}")
        history.commit(dataset.dataset_id, next_dataset, object(), {"step": index})
        dataset = next_dataset

    history.move(dataset.dataset_id, "undo")
    assert history.metadata(dataset.dataset_id)["is_dirty"] is True

    history.mark_saved(dataset.dataset_id)
    assert history.metadata(dataset.dataset_id)["is_dirty"] is False


def test_history_limit_is_configurable_and_trims_existing_states():
    history = HistoryService()
    dataset = make_dataset("source.csv")
    history.open(dataset, object())
    for index in range(1, 5):
        next_dataset = make_dataset(f"derived-{index}")
        history.commit(dataset.dataset_id, next_dataset, object(), {"step": index})
        dataset = next_dataset

    history.set_max_actions(2)

    assert len(history.history_for(dataset.dataset_id).states) == 3
    assert history.metadata(dataset.dataset_id)["current_index"] == 2
    history.move(dataset.dataset_id, "undo")
    history.move(dataset.dataset_id, "undo")
    assert history.current(dataset.dataset_id).dataset.source_path == "derived-2"
    with pytest.raises(RequestError):
        history.move(dataset.dataset_id, "undo")


@pytest.mark.parametrize("limit", [0, 101, 1.5, True])
def test_history_limit_rejects_values_outside_allowed_range(limit):
    history = HistoryService()
    with pytest.raises(RequestError):
        history.set_max_actions(limit)


@pytest.mark.parametrize("direction", ["undo", "redo"])
def test_move_rejects_history_boundaries(direction):
    history = HistoryService()
    source = make_dataset("source.csv")
    history.open(source, object())
    with pytest.raises(RequestError):
        history.move(source.dataset_id, direction)
