import json
from forma_engine.bootstrap import build_router
from forma_engine.ipc.protocol import decode, failure
from forma_engine.domain.errors import InvalidTransformationError


def test_cleaning_preview_returns_bounded_before_after(tmp_path):
    path = tmp_path / "data.csv"
    path.write_text("x\n1\n\n")
    router, jobs = build_router()
    opened = router.dispatch("dataset.open", {"path": str(path)})
    result = router.dispatch(
        "cleaning.preview",
        {
            "dataset_id": opened["dataset_id"],
            "operation": {"type": "drop_null_rows", "parameters": {}},
        },
    )
    assert len(result["before"]) <= 100 and len(result["after"]) <= 100
    jobs.shutdown()


def test_invalid_filter_returns_stable_transformation_error():
    error = failure("r1", InvalidTransformationError("Unknown column."))
    assert error["error"]["code"] == "INVALID_TRANSFORMATION"


def test_request_decoder_keeps_object_params():
    request = decode(
        json.dumps(
            {"id": "r1", "method": "cleaning.apply", "params": {"operations": []}}
        )
    )
    assert request["params"]["operations"] == []
