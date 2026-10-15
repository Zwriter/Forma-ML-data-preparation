import time
from forma_engine.bootstrap import build_router


def wait_for(manager, job_id, terminal):
    for _ in range(200):
        status = manager.status(job_id)
        if status["state"] in terminal:
            return status
        time.sleep(0.01)
    raise AssertionError("Job did not reach terminal state")


def test_profile_clean_and_retain_source(tmp_path):
    path = tmp_path / "input.csv"
    source = b"x,kind\n1,a\n,a\n2,b\n"
    path.write_bytes(source)
    router, jobs = build_router()
    opened = router.dispatch("dataset.open", {"path": str(path)})
    profile_ack = router.dispatch(
        "dataset.profile", {"dataset_id": opened["dataset_id"]}
    )
    report = wait_for(jobs, profile_ack["job_id"], {"completed"})["result"]
    assert report["missing_counts"]["x"] == 1
    clean_ack = router.dispatch(
        "cleaning.apply",
        {
            "dataset_id": opened["dataset_id"],
            "operations": [{"type": "drop_null_rows", "parameters": {}}],
        },
    )
    cleaned = wait_for(jobs, clean_ack["job_id"], {"completed"})["result"]["dataset"]
    after = router.dispatch(
        "dataset.preview", {"dataset_id": cleaned["dataset_id"], "limit": 10}
    )
    assert len(after["records"]) == 2
    assert path.read_bytes() == source
    jobs.shutdown()


def test_failed_transformation_keeps_source_and_creates_no_derived_reference(tmp_path):
    path = tmp_path / "input.csv"
    path.write_text("x\n1\n")
    router, jobs = build_router()
    opened = router.dispatch("dataset.open", {"path": str(path)})
    ack = router.dispatch(
        "cleaning.apply",
        {
            "dataset_id": opened["dataset_id"],
            "operations": [
                {"type": "convert_type", "parameters": {"column": "x", "to": "invalid"}}
            ],
        },
    )
    failure = wait_for(jobs, ack["job_id"], {"failed"})
    assert failure["error"]["code"] == "INVALID_TRANSFORMATION"
    assert router.dispatch(
        "dataset.preview", {"dataset_id": opened["dataset_id"], "limit": 10}
    )["records"] == [{"x": 1}]
    assert len(router.datasets.datasets) == 1
    jobs.shutdown()


def test_runtime_conversion_failure_is_actionable_and_preserves_last_result(tmp_path):
    path = tmp_path / "input.csv"
    raw = b"x\nnot-a-number\n"
    path.write_bytes(raw)
    router, jobs = build_router()
    opened = router.dispatch("dataset.open", {"path": str(path)})
    ack = router.dispatch(
        "cleaning.apply",
        {
            "dataset_id": opened["dataset_id"],
            "operations": [
                {"type": "convert_type", "parameters": {"column": "x", "to": "integer"}}
            ],
        },
    )
    result = wait_for(jobs, ack["job_id"], {"failed"})
    assert result["error"]["code"] == "INVALID_TRANSFORMATION"
    assert path.read_bytes() == raw
    assert len(router.datasets.datasets) == 1
    jobs.shutdown()
