"""IPC for the Profile ribbon tools: validate parameters, then submit the tool job."""

from forma_engine.domain.errors import RequestError
from forma_engine.ipc.params import required_text

BINS = {10, 20, 30, 50}
MAX_ROWS = 100


def _count(params, key, default, low, high=None):
    value = params.get(key, default)
    valid = isinstance(value, int) and not isinstance(value, bool)
    if not valid or value < low or (high is not None and value > high):
        limit = f"between {low} and {high}" if high is not None else f"at least {low}"
        raise RequestError(f"{key} must be a whole number {limit}.")
    return value


class ProfileToolHandlers:
    def __init__(self, datasets, tools):
        self.datasets, self.tools = datasets, tools

    def _submit(self, tool, params, extra=None):
        dataset_id, version = self._base(params)
        return self.tools.submit(tool, dataset_id, version, extra or {})

    def _base(self, params):
        dataset_id = required_text(params, "dataset_id", "Provide a dataset_id.")
        version = required_text(
            params, "data_version", "Provide the profile's data_version."
        )
        self.datasets.get(dataset_id)
        return dataset_id, version

    def _column(self, params, value, required=True):
        if value is None and not required:
            return None
        names = self.datasets.frame(params["dataset_id"]).collect_schema().names()
        if not isinstance(value, str) or value not in names:
            raise RequestError("Choose an existing column.")
        return value

    def column_detail(self, params):
        self._base(params)
        column = self._column(params, params.get("column"))
        return self._submit("column_detail", params, {"column": column})

    def rows(self, params):
        self._base(params)
        rule = params.get("filter")
        if not isinstance(rule, dict) or rule.get("kind") not in {
            "problems",
            "outliers",
        }:
            raise RequestError("filter.kind must be problems or outliers.")
        outliers = rule["kind"] == "outliers"
        column = self._column(params, rule.get("column"), required=outliers)
        return self._submit(
            "rows",
            params,
            {
                "filter": {"kind": rule["kind"], "column": column},
                "offset": _count(params, "offset", 0, 0),
                "limit": _count(params, "limit", MAX_ROWS, 1, MAX_ROWS),
            },
        )

    def distribution(self, params):
        self._base(params)
        column = self._column(params, params.get("column"))
        bins = params.get("bins")
        if isinstance(bins, bool) or bins not in BINS:
            raise RequestError("bins must be 10, 20, 30, or 50.")
        return self._submit("distribution", params, {"column": column, "bins": bins})

    def duplicates(self, params):
        self._base(params)
        columns = params.get("columns")
        if columns is not None:
            if not isinstance(columns, list) or not columns:
                raise RequestError("Choose at least one column, or null for all.")
            if len(set(columns)) != len(columns):
                raise RequestError("Choose each column once.")
            for column in columns:
                self._column(params, column)
        return self._submit("duplicates", params, {"columns": columns})

    def patterns(self, params):
        return self._submit("patterns", params)

    def anomalies(self, params):
        return self._submit("anomalies", params)

    def suggestions(self, params):
        return self._submit("suggestions", params)
