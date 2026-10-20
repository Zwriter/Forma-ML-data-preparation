from forma_engine.services.dataset_service import DatasetService
from forma_engine.services.data_operation_service import DataOperationService


def test_search_filters_full_dataset_before_pagination(tmp_path):
    source = tmp_path / "records.csv"
    source.write_text(
        "value,label\n"
        + "".join(
            f"{index},needle\n" if index % 10 == 0 else f"{index},other\n"
            for index in range(1000)
        ),
        encoding="utf-8",
    )
    service = DatasetService()
    dataset = service.open(str(source))

    first = service.preview(dataset["dataset_id"], limit=10, search="needle")
    second = service.preview(
        dataset["dataset_id"], offset=10, limit=10, search="needle"
    )

    assert [row["value"] for row in first["records"]] == list(range(0, 100, 10))
    assert [row["value"] for row in second["records"]] == list(range(100, 200, 10))
    assert first["total_count"] == second["total_count"] == 100


def test_search_respects_projected_columns_and_is_case_insensitive(tmp_path):
    source = tmp_path / "records.csv"
    source.write_text("name,secret\nAlpha,match\nBeta,none\n", encoding="utf-8")
    service = DatasetService()
    dataset = service.open(str(source))

    result = service.preview(
        dataset["dataset_id"], columns=["name"], search="ALP", limit=10
    )

    assert result["records"] == [{"name": "Alpha"}]
    assert result["total_count"] == 1

    header_search = service.preview(
        dataset["dataset_id"], columns=["name"], search="NAME", limit=10
    )
    assert header_search["records"] == [{"name": "Alpha"}, {"name": "Beta"}]
    assert header_search["total_count"] == 2


def test_data_filter_paginates_filtered_rows_across_original_page_boundaries(tmp_path):
    source = tmp_path / "records.csv"
    source.write_text(
        "value\n" + "".join(f"{index}\n" for index in range(1000)),
        encoding="utf-8",
    )
    service = DatasetService()
    dataset = service.open(str(source))

    result = DataOperationService(service).apply(
        dataset["dataset_id"],
        {
            "type": "filter_rows",
            "parameters": {
                "mode": "all",
                "rules": [
                    {"column": "value", "operator": "at_least", "value": 900}
                ],
            },
        },
        lambda: False,
    )
    page = service.preview(result["dataset"]["dataset_id"], limit=10)

    assert [row["value"] for row in page["records"]] == list(range(900, 910))
    assert page["total_count"] == 100
