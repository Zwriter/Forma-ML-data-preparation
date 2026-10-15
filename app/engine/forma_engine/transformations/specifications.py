from dataclasses import dataclass
from typing import Any
from forma_engine.transformations.validators import SUPPORTED


@dataclass(frozen=True)
class TransformationSpec:
    type: str
    parameters: dict[str, Any]
    enabled: bool = True
    order: int = 0
    operation_id: str | None = None

    def __post_init__(self):
        if self.type not in SUPPORTED:
            raise ValueError("unsupported transformation type")
        if not isinstance(self.parameters, dict):
            raise ValueError("parameters must be an object")
        if not isinstance(self.enabled, bool):
            raise ValueError("enabled must be a boolean")
        if self.order < 0:
            raise ValueError("order must be non-negative")

    @classmethod
    def from_dict(cls, value: dict[str, Any]):
        return cls(
            value["type"],
            value.get("parameters", {}),
            value.get("enabled", True),
            value.get("order", 0),
            value.get("operation_id"),
        )
