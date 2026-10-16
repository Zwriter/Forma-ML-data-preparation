from dataclasses import dataclass, field
from typing import Any

from forma_engine.domain.entities import ChangeHistory, Dataset, WorkingStateEntry
from forma_engine.domain.errors import HistoryBoundaryError, RequestError


@dataclass
class HistoryService:
    histories: dict[str, ChangeHistory] = field(default_factory=dict)
    dataset_histories: dict[str, str] = field(default_factory=dict)

    def open(self, dataset: Dataset, frame: Any) -> dict:
        history = ChangeHistory(states=[WorkingStateEntry(dataset, frame)])
        self.histories[history.history_id] = history
        self.dataset_histories[dataset.dataset_id] = history.history_id
        return history.to_dict()

    def history_for(self, dataset_id: str) -> ChangeHistory:
        history_id = self.dataset_histories.get(dataset_id)
        history = self.histories.get(history_id or "")
        if history is None:
            raise RequestError("Dataset history is no longer available.")
        return history

    def metadata(self, dataset_id: str) -> dict:
        return self.history_for(dataset_id).to_dict()

    def current(self, dataset_id: str) -> WorkingStateEntry:
        return self.history_for(dataset_id).current

    def commit(
        self, dataset_id: str, dataset: Dataset, frame: Any, operation: dict
    ) -> dict:
        history = self.history_for(dataset_id)
        del history.states[history.current_index + 1 :]
        if history.saved_index > history.current_index:
            history.saved_index = -1
        entry = WorkingStateEntry(dataset, frame, operation)
        history.states.append(entry)
        history.current_index += 1
        self.dataset_histories[dataset.dataset_id] = history.history_id
        return history.to_dict()

    def move(self, dataset_id: str, direction: str) -> WorkingStateEntry:
        history = self.history_for(dataset_id)
        if direction not in {"undo", "redo"}:
            raise RequestError("Choose undo or redo.")
        target = history.current_index + (1 if direction == "redo" else -1)
        if not 0 <= target < len(history.states):
            raise HistoryBoundaryError(
                f"Cannot {direction}: no matching history state exists."
            )
        history.current_index = target
        return history.current

    def mark_saved(self, dataset_id: str, saved_dataset_id: str | None = None) -> dict:
        history = self.history_for(dataset_id)
        state_id = saved_dataset_id or history.current.dataset_id
        history.saved_index = next(
            (
                index
                for index, state in enumerate(history.states)
                if state.dataset_id == state_id
            ),
            -1,
        )
        return history.to_dict()
