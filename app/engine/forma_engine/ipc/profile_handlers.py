from forma_engine.domain.errors import RequestError
from forma_engine.ipc.params import flag as _flag, required_text as _text


class ProfileHandlers:
    def __init__(self, datasets, service, jobs=None, invalid_rows=None):
        self.datasets, self.service = datasets, service
        self.jobs, self.invalid_rows = jobs, invalid_rows

    def profile(self, params):
        dataset_id = _text(params, "dataset_id", "Provide a dataset_id.")
        self.datasets.get(dataset_id)
        return self.service.submit(dataset_id)

    def report(self, params):
        dataset_id = _text(params, "dataset_id", "Provide a dataset_id.")
        version = _text(params, "data_version", "Provide the profile's data_version.")
        destination = _text(params, "destination", "Choose where to save the report.")
        charts = []
        for key in ("distribution_column", "category_column"):
            column = params.get(key)
            if column is not None and not isinstance(column, str):
                raise RequestError(f"{key} must be a column name or null.")
            charts.append(column)
        overwrite = _flag(params, "force_overwrite")
        self.datasets.get(dataset_id)
        return self.service.submit_report(
            dataset_id, version, destination, *charts, overwrite
        )

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
