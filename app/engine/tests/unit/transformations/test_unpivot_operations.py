import polars as pl
import pytest

from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.transformations.executor import execute


def unpivot(frame, **overrides):
    parameters = {
        "identifier_columns": ["name"],
        "value_columns": ["Jan", "Feb"],
        "attribute_name": "month",
        "value_name": "amount",
    }
    parameters.update(overrides)
    return execute(
        frame.lazy(), [{"type": "unpivot", "parameters": parameters}]
    ).collect()


def test_unpivot_preserves_identifiers_selected_values_and_row_count():
    frame = pl.DataFrame(
        {"name": ["A", "B"], "Jan": [1, 3], "Feb": [2, 4], "note": ["x", "y"]}
    )
    result = unpivot(frame)
    assert result.columns == ["name", "month", "amount"]
    assert result.to_dicts() == [
        {"name": "A", "month": "Jan", "amount": 1},
        {"name": "A", "month": "Feb", "amount": 2},
        {"name": "B", "month": "Jan", "amount": 3},
        {"name": "B", "month": "Feb", "amount": 4},
    ]


@pytest.mark.parametrize(
    "overrides",
    [
        {"identifier_columns": []},
        {"identifier_columns": ["missing"]},
        {"identifier_columns": ["name", "name"]},
        {"value_columns": []},
        {"value_columns": ["name"]},
        {"value_columns": ["Jan", "Jan"]},
        {"attribute_name": "name"},
        {"value_name": "month"},
        {"attribute_name": ""},
        {"value_name": "  "},
    ],
)
def test_unpivot_rejects_empty_duplicate_missing_or_colliding_roles(overrides):
    frame = pl.DataFrame({"name": ["A"], "Jan": [1], "Feb": [2]}).lazy()
    with pytest.raises(InvalidTransformationError):
        unpivot(frame, **overrides)
