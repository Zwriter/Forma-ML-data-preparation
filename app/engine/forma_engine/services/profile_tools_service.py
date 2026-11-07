"""Runs the Profile ribbon tools as background jobs on the current data version."""

from dataclasses import dataclass
from typing import Callable

from forma_engine.domain.errors import CancelledError, ProfileStaleError, RequestError
from forma_engine.profiling.report import utc_now

# Tool name → job kind (contracts/ipc.md).
JOB_KINDS = {
    "column_detail": "profile_column",
    "rows": "profile_rows",
    "distribution": "profile_distribution",
    "duplicates": "profile_duplicates",
    "patterns": "profile_patterns",
    "anomalies": "profile_anomalies",
    "suggestions": "profile_suggestions",
}


@dataclass(frozen=True)
class ToolContext:
    """What a tool function may use: the lazy frame, the job token, and the last
    profile for this history (None when there is none)."""

    frame: object
    token: Callable[[], bool]
    profile: dict | None


class ProfileToolsService:
    def __init__(self, datasets, jobs, tools: dict, latest_profile: Callable):
        """`tools` maps a tool name to `fn(context, params) -> dict`; adding a tool
        needs no change here."""
        self.datasets, self.jobs = datasets, jobs
        self.tools, self.latest_profile = tools, latest_profile

    def has(self, tool: str) -> bool:
        return tool in self.tools

    def submit(self, tool: str, dataset_id: str, data_version: str, params: dict):
        if not self.has(tool):
            raise RequestError("This tool is not available yet.")
        if self.datasets.data_version(dataset_id) != data_version:
            raise ProfileStaleError(
                "The data changed. Refresh the profile and try again."
            )
        frame = self.datasets.frame(dataset_id)
        profile = self.latest_profile(self.datasets.history_id(dataset_id))
        run = self.tools[tool]

        def work(token):
            result = run(ToolContext(frame, token, profile), params)
            if token():
                raise CancelledError("The tool was cancelled.")
            return {
                "dataset_id": dataset_id,
                "data_version": data_version,
                "computed_at": utc_now(),
                **result,
            }

        return self.jobs.submit(JOB_KINDS[tool], work, abandon_on_cancel=True)
