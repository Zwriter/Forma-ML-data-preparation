from forma_engine.domain.errors import RequestError


class DatasetHandlers:
    def __init__(self, datasets):
        self.datasets = datasets

    def open(self, params):
        path = params.get("path")
        if not isinstance(path, str) or not path.strip():
            raise RequestError("Provide a local file path.")
        return self.datasets.open(path)

    def preview(self, params):
        self._dataset_id(params)
        columns = params.get("columns")
        if columns is not None and (
            not isinstance(columns, list)
            or any(not isinstance(item, str) for item in columns)
        ):
            raise RequestError("columns must be a list of column names.")
        return self.datasets.preview(
            params["dataset_id"],
            params.get("offset", 0),
            params.get("limit", 100),
            columns,
        )

    def _dataset_id(self, params):
        if not isinstance(params.get("dataset_id"), str) or not params["dataset_id"]:
            raise RequestError("Provide a dataset_id.")
