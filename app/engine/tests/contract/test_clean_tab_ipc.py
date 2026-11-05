import pytest
from forma_engine.bootstrap import build_router
from forma_engine.domain.errors import InvalidTransformationError, RequestError


@pytest.fixture
def opened(tmp_path):
    path = tmp_path / "data.csv"
    path.write_text("name,score\nAna Pop,1\nIon Rusu,\nIon Rusu,\n")
    router, jobs = build_router()
    dataset = router.dispatch("dataset.open", {"path": str(path)})
    yield router, dataset["dataset_id"]
    jobs.shutdown()


def fill(step_id="s1", column="score"):
    return {
        "operation_id": step_id,
        "type": "fill_null",
        "parameters": {"column": column, "strategy": "constant", "value": 0},
    }


def test_validate_reports_each_step(opened):
    router, dataset_id = opened
    result = router.dispatch(
        "cleaning.validate",
        {"dataset_id": dataset_id, "operations": [fill(), fill("s2", "nope")]},
    )
    assert result["valid"] is False
    assert result["steps"][0] == {"index": 0, "operation_id": "s1", "valid": True}
    assert result["steps"][1]["valid"] is False
    assert result["steps"][1]["message"]


@pytest.mark.parametrize("operations", [None, {}, ["x"]])
def test_validate_rejects_malformed_operation_lists(opened, operations):
    router, dataset_id = opened
    with pytest.raises(RequestError):
        router.dispatch(
            "cleaning.validate", {"dataset_id": dataset_id, "operations": operations}
        )


def test_preview_accepts_multiple_steps_and_returns_markers(opened):
    router, dataset_id = opened
    result = router.dispatch(
        "cleaning.preview",
        {
            "dataset_id": dataset_id,
            "operations": [fill(), {"type": "drop_duplicates", "parameters": {}}],
        },
    )
    assert set(result) >= {
        "columns",
        "rows",
        "changed_cells",
        "offset",
        "limit",
        "total_count",
        "summary",
    }
    # Affected rows first: the filled row, then the removed duplicate, then the rest.
    assert [row["removed"] for row in result["rows"]] == [False, True, False]
    # The removed duplicate was also filled; only surviving rows count as changed.
    assert result["summary"]["values_changed"] == 1


def test_preview_keeps_legacy_single_operation_shape(opened):
    router, dataset_id = opened
    result = router.dispatch(
        "cleaning.preview", {"dataset_id": dataset_id, "operation": fill()}
    )
    assert len(result["rows"]) == 3


def test_preview_limit_is_bounded(opened):
    router, dataset_id = opened
    result = router.dispatch(
        "cleaning.preview",
        {"dataset_id": dataset_id, "operations": [fill()], "limit": 1},
    )
    assert len(result["rows"]) == 1
    for limit in (0, 20001, True, "5"):
        with pytest.raises(RequestError):
            router.dispatch(
                "cleaning.preview",
                {"dataset_id": dataset_id, "operations": [fill()], "limit": limit},
            )


def test_preview_error_identifies_the_failing_step(opened):
    router, dataset_id = opened
    with pytest.raises(InvalidTransformationError, match="^Step 2: "):
        router.dispatch(
            "cleaning.preview",
            {"dataset_id": dataset_id, "operations": [fill(), fill("s2", "nope")]},
        )


def test_preview_pages_projects_and_searches_like_the_worksheet(opened):
    router, dataset_id = opened
    result = router.dispatch(
        "cleaning.preview",
        {
            "dataset_id": dataset_id,
            "operations": [fill(), {"type": "drop_duplicates", "parameters": {}}],
            "offset": 1,
            "limit": 5,
            "columns": ["score", "name"],
            "search": "rusu",
        },
    )
    assert [column["name"] for column in result["columns"]] == ["score", "name"]
    assert result["columns"][0]["origin"] == "score"
    assert result["rows"] == [
        {"values": {"score": None, "name": "Ion Rusu"}, "removed": True}
    ]
    assert (result["offset"], result["limit"], result["total_count"]) == (1, 5, 2)
    assert result["summary"]["rows_removed"] == 1


@pytest.mark.parametrize(
    "page",
    [
        {"offset": -1},
        {"offset": True},
        {"offset": "1"},
        {"columns": "score"},
        {"columns": [1]},
        {"columns": ["nope"]},
        {"search": 5},
    ],
)
def test_preview_rejects_invalid_page_parameters(opened, page):
    router, dataset_id = opened
    with pytest.raises(RequestError):
        router.dispatch(
            "cleaning.preview",
            {"dataset_id": dataset_id, "operations": [fill()], **page},
        )
