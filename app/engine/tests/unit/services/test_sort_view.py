import pytest

from forma_engine.domain.errors import InvalidTransformationError
from forma_engine.services.cleaning_service import CleaningService
from forma_engine.services.data_operation_service import DataOperationService
from forma_engine.services.dataset_service import DatasetService


def never():
    return False


def key(column, direction="descending", nulls="last"):
    return {"column": column, "direction": direction, "nulls": nulls}


def sort(keys):
    return {"type": "sort_rows", "parameters": {"keys": keys}}


@pytest.fixture
def opened(tmp_path):
    source = tmp_path / "people.csv"
    source.write_text("id,city,n\n1,b,\n2,z,5\n3,a,\n4,z,7\n", encoding="utf-8")
    datasets = DatasetService()
    dataset_id = datasets.open(str(source))["dataset_id"]
    return datasets, DataOperationService(datasets), dataset_id


def ids(datasets, dataset_id, **page):
    return [row["id"] for row in datasets.preview(dataset_id, **page)["records"]]


def stored_ids(datasets, dataset_id):
    return datasets.frame(dataset_id).collect()["id"].to_list()


def test_sort_commits_a_view_without_reordering_the_data(opened):
    datasets, operations, source_id = opened
    before = datasets.frame(source_id)

    result = operations.apply(source_id, sort([key("city")]), never)

    sorted_id = result["dataset"]["dataset_id"]
    assert result["history"]["is_dirty"] is True
    assert datasets.frame(sorted_id) is before
    assert datasets.history_service.current(sorted_id).view == [key("city")]
    assert stored_ids(datasets, sorted_id) == [1, 2, 3, 4]


def test_sort_with_no_keys_clears_the_view(opened):
    datasets, operations, source_id = opened
    sorted_id = operations.apply(source_id, sort([key("city")]), never)["dataset"][
        "dataset_id"
    ]

    cleared = operations.apply(sorted_id, sort([]), never)["dataset"]["dataset_id"]

    assert datasets.history_service.current(cleared).view == []


def test_preview_returns_rows_in_view_order_before_paging_and_search(opened):
    datasets, operations, source_id = opened
    sorted_id = operations.apply(source_id, sort([key("city")]), never)["dataset"][
        "dataset_id"
    ]

    assert ids(datasets, sorted_id) == [2, 4, 1, 3]
    assert ids(datasets, sorted_id, offset=1, limit=2) == [4, 1]
    assert ids(datasets, sorted_id, search="z") == [2, 4]
    assert datasets.preview(sorted_id)["view"] == [key("city")]


def test_preview_without_a_view_reports_an_empty_view(opened):
    datasets, _, source_id = opened

    assert datasets.preview(source_id)["view"] == []


def test_filter_keeps_the_view(opened):
    datasets, operations, source_id = opened
    sorted_id = operations.apply(source_id, sort([key("city")]), never)["dataset"][
        "dataset_id"
    ]
    rule = {"column": "id", "operator": "greater_than", "value": 1}
    filtered = {"type": "filter_rows", "parameters": {"mode": "all", "rules": [rule]}}

    result = operations.apply(sorted_id, filtered, never)["dataset"]["dataset_id"]

    assert datasets.history_service.current(result).view == [key("city")]
    assert ids(datasets, result) == [2, 4, 3]


def test_reshape_clears_the_view(opened):
    datasets, operations, source_id = opened
    sorted_id = operations.apply(source_id, sort([key("city")]), never)["dataset"][
        "dataset_id"
    ]
    group = {
        "type": "group_by",
        "parameters": {
            "group_columns": ["city"],
            "aggregations": [
                {"column": None, "function": "count", "output_name": "rows"}
            ],
        },
    }

    result = operations.apply(sorted_id, group, never)["dataset"]["dataset_id"]

    assert datasets.history_service.current(result).view == []


def test_clean_apply_carries_the_view_through_renames_and_removals(opened):
    datasets, operations, source_id = opened
    sorted_id = operations.apply(source_id, sort([key("city"), key("n")]), never)[
        "dataset"
    ]["dataset_id"]
    steps = [
        {"type": "rename_columns", "parameters": {"mapping": {"city": "town"}}},
        {"type": "drop_columns", "parameters": {"columns": ["n"]}},
    ]

    result = CleaningService(datasets).apply(sorted_id, steps, never)

    view = datasets.history_service.current(result["dataset"]["dataset_id"]).view
    assert view == [key("town")]


def test_clean_steps_run_in_stored_order_and_preview_pages_in_view_order(opened):
    datasets, operations, source_id = opened
    sorted_id = operations.apply(source_id, sort([key("city")]), never)["dataset"][
        "dataset_id"
    ]
    fill = {"type": "fill_null", "parameters": {"column": "n", "strategy": "previous"}}
    cleaning = CleaningService(datasets)

    preview = cleaning.preview(sorted_id, [fill])

    rows = [(row["values"]["id"], row["values"]["n"]) for row in preview["rows"]]
    assert rows == [(2, 5), (4, 7), (1, None), (3, 5)]
    assert preview["changed_cells"] == [{"row": 3, "column": "n", "before": None}]
    assert preview["view"] == [key("city")]


def test_clean_preview_reports_the_view_after_the_draft(opened):
    datasets, operations, source_id = opened
    sorted_id = operations.apply(source_id, sort([key("city")]), never)["dataset"][
        "dataset_id"
    ]
    rename = {"type": "rename_columns", "parameters": {"mapping": {"city": "town"}}}

    preview = CleaningService(datasets).preview(sorted_id, [rename])

    assert preview["view"] == [key("town")]


def test_sort_rejects_unknown_columns(opened):
    _, operations, source_id = opened

    with pytest.raises(InvalidTransformationError):
        operations.apply(source_id, sort([key("missing")]), never)
