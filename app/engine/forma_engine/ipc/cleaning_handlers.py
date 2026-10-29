from forma_engine.domain.errors import RequestError

MAX_PREVIEW_ROWS = 500


class CleaningHandlers:
    def __init__(self, datasets, cleaning):
        self.datasets, self.cleaning = datasets, cleaning

    def preview(self, params):
        dataset_id = self._dataset_id(params)
        if "operations" not in params and isinstance(params.get("operation"), dict):
            operations = [params["operation"]]
        else:
            operations = self._operations(params)
        limit = params.get("limit", 100)
        if (
            not isinstance(limit, int)
            or isinstance(limit, bool)
            or not 1 <= limit <= MAX_PREVIEW_ROWS
        ):
            raise RequestError(
                f"limit must be an integer from 1 to {MAX_PREVIEW_ROWS}."
            )
        return self.cleaning.preview(dataset_id, operations, limit)

    def validate(self, params):
        dataset_id = self._dataset_id(params)
        return self.cleaning.validate_steps(dataset_id, self._operations(params))

    def apply(self, params):
        dataset_id = self._dataset_id(params)
        return self.cleaning.submit(dataset_id, self._operations(params))

    @staticmethod
    def _operations(params):
        operations = params.get("operations")
        if not isinstance(operations, list) or any(
            not isinstance(item, dict) for item in operations
        ):
            raise RequestError("operations must be a list of operation objects.")
        return operations

    def _dataset_id(self, params):
        value = params.get("dataset_id")
        if not isinstance(value, str) or not value:
            raise RequestError("Provide a dataset_id.")
        self.datasets.get(value)
        return value
