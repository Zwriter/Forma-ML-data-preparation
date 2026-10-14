from forma_engine.domain.errors import RequestError

class CleaningHandlers:
    def __init__(self, datasets, cleaning): self.datasets, self.cleaning = datasets, cleaning
    def preview(self, params):
        dataset_id = self._dataset_id(params)
        operation = params.get("operation")
        if not isinstance(operation, dict): raise RequestError("operation must be an object.")
        return self.cleaning.preview(dataset_id, operation)
    def apply(self, params):
        dataset_id = self._dataset_id(params); operations = params.get("operations")
        if not isinstance(operations, list) or any(not isinstance(item, dict) for item in operations): raise RequestError("operations must be a list of operation objects.")
        return self.cleaning.submit(dataset_id, operations)
    def _dataset_id(self, params):
        value = params.get("dataset_id")
        if not isinstance(value, str) or not value: raise RequestError("Provide a dataset_id.")
        self.datasets.get(value); return value
