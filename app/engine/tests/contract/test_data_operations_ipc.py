import pytest

from forma_engine.bootstrap import build_router
from forma_engine.domain.errors import FormaError


@pytest.fixture
def app_router():
    router, jobs = build_router()
    yield router, jobs
    jobs.shutdown()


@pytest.mark.parametrize(
    "operation", [None, [], {"type": "filter_rows"}, {"type": "merge"}]
)
def test_data_apply_rejects_invalid_payloads(app_router, operation, tmp_path):
    router, _ = app_router
    source = tmp_path / "invalid.csv"
    source.write_text("value\n1\n", encoding="utf-8")
    dataset = router.dispatch("dataset.open", {"path": str(source)})
    with pytest.raises(FormaError):
        router.dispatch(
            "data.apply",
            {"dataset_id": dataset["dataset_id"], "operation": operation},
        )


def test_data_apply_accepts_typed_filter_and_sort_jobs(app_router, tmp_path):
    router, _ = app_router
    source = tmp_path / "records.csv"
    source.write_text("name,amount\na,2\nb,1\n", encoding="utf-8")
    dataset = router.dispatch("dataset.open", {"path": str(source)})
    for index, operation in enumerate(
        (
            {
                "type": "filter_rows",
                "parameters": {
                    "mode": "all",
                    "rules": [
                        {"column": "amount", "operator": "greater_than", "value": 1},
                    ],
                },
            },
            {
                "type": "sort_rows",
                "parameters": {
                    "keys": [
                        {"column": "amount", "direction": "ascending", "nulls": "last"},
                    ]
                },
            },
        )
    ):
        target = dataset["dataset_id"]
        if index:
            path = tmp_path / "sort.csv"
            path.write_text("name,amount\na,2\nb,1\n", encoding="utf-8")
            target = router.dispatch("dataset.open", {"path": str(path)})["dataset_id"]
        result = router.dispatch(
            "data.apply", {"dataset_id": target, "operation": operation}
        )
        assert result["job_id"]
        assert result["state"] in {"pending", "running"}
