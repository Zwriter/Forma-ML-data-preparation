from forma_engine.domain.errors import RequestError


def _text(params, key, message):
    value = params.get(key)
    if not isinstance(value, str) or not value.strip():
        raise RequestError(message)
    return value


def _flag(params, key):
    value = params.get(key, False)
    if not isinstance(value, bool):
        raise RequestError(f"{key} must be a boolean.")
    return value


class ProfileHandlers:
    def __init__(self, datasets, service, jobs=None, invalid_rows=None):
        self.datasets, self.service = datasets, service
        self.jobs, self.invalid_rows = jobs, invalid_rows

    def profile(self, params):
        dataset_id = _text(params, "dataset_id", "Provide a dataset_id.")
        self.datasets.get(dataset_id)
        return self.service.submit(dataset_id)

    def export_invalid(self, params):
        dataset_id = _text(params, "dataset_id", "Provide a dataset_id.")
        version = _text(params, "data_version", "Provide the profile's data_version.")
        destination = _text(params, "destination", "Choose an export destination.")
        column = params.get("column")
        if column is not None and not isinstance(column, str):
            raise RequestError("column must be a column name or null.")
        fmt = params.get("format")
        if fmt not in {"csv", "parquet"}:
            raise RequestError("Choose CSV or Parquet.")
        overwrite = _flag(params, "force_overwrite")
        return self.invalid_rows.submit(
            self.jobs, dataset_id, version, column, destination, fmt, overwrite
        )
