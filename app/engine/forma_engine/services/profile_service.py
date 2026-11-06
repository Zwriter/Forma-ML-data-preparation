from pathlib import Path

from forma_engine.domain.errors import CancelledError, ProfileStaleError, RequestError
from forma_engine.io.writers import write_text_safe
from forma_engine.profiling.html_report import render_report
from forma_engine.profiling.statistics import profile


class ProfileService:
    def __init__(self, datasets, jobs):
        self.datasets, self.jobs = datasets, jobs
        self._latest: dict[str, dict] = {}  # last finished profile per history

    def latest(self, history_id: str) -> dict | None:
        return self._latest.get(history_id)

    def submit(self, dataset_id: str):
        frame = self.datasets.frame(dataset_id)
        history_id = self.datasets.history_id(dataset_id)
        data_version = self.datasets.data_version(dataset_id)

        def work(token):
            result = profile(frame, dataset_id, history_id, data_version, token)
            self._latest[history_id] = result
            return result

        return self.jobs.submit("profile", work)

    def submit_report(
        self, dataset_id, data_version, destination, distribution, category, overwrite
    ):
        """Writes the latest profile as an HTML report, if it matches `data_version`."""
        current = self.latest(self.datasets.history_id(dataset_id))
        if (
            current is None
            or current["data_version"] != data_version
            or self.datasets.data_version(dataset_id) != data_version
        ):
            raise ProfileStaleError(
                "The profile is out of date. Refresh it and try again."
            )
        if not destination.lower().endswith(".html"):
            raise RequestError("Save the report as an .html file.")
        summaries = {c["name"]: c for c in current["columns"]}
        for name, kind in ((distribution, "numeric"), (category, "categories")):
            if name is not None and not (summaries.get(name) or {}).get(kind):
                raise RequestError(f"{name} has no chart of that kind.")
        title = Path(self.datasets.get(dataset_id).source_path).name
        html = render_report(current, title, distribution, category)

        def work(cancel):
            try:
                return write_text_safe(html, destination, overwrite, cancel)
            except InterruptedError as exc:
                raise CancelledError("Report was cancelled.") from exc

        return self.jobs.submit("profile_report", work)
