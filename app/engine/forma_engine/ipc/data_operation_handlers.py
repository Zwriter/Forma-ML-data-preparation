from forma_engine.domain.errors import RequestError
from forma_engine.transformations.validators import validate
from forma_engine.transformations.filter_parser import compile_rules


class DataOperationHandlers:
    def __init__(self, datasets, operations):
        self.datasets, self.operations = datasets, operations

    def apply(self, params):
        dataset_id = params.get("dataset_id")
        operation = params.get("operation")
        if not isinstance(dataset_id, str) or not dataset_id:
            raise RequestError("Provide a dataset_id.")
        self.datasets.get(dataset_id)
        if not isinstance(operation, dict):
            raise RequestError("operation must be an object.")
        if self.operations is None:
            raise RequestError("Data operations are not available.")
        if operation.get("type") not in {
            "filter_rows", "sort_rows", "group_by", "pivot", "unpivot"
        }:
            raise RequestError("Choose a supported data operation.")
        schema = self.datasets.frame(dataset_id).collect_schema()
        validate(operation, schema.names(), schema)
        if operation["type"] == "filter_rows":
            if "rules" not in operation["parameters"]:
                raise RequestError("Provide typed filter rules.")
            compile_rules(
                operation["parameters"]["rules"],
                operation["parameters"]["mode"],
                self.datasets.frame(dataset_id).collect_schema(),
            )
        return self.operations.submit(dataset_id, operation)
