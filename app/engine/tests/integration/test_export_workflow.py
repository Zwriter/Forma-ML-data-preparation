import time
import polars as pl
from forma_engine.bootstrap import build_router
from forma_engine.domain.errors import CancelledError


def finish(manager, job_id):
    for _ in range(300):
        result = manager.status(job_id)
        if result["state"] in {"completed", "failed", "cancelled"}:
            return result
        time.sleep(0.01)
    raise AssertionError("Export did not finish")


def test_export_reopens_and_preserves_source(tmp_path):
    source = tmp_path / "input.csv"
    raw = b"x\n1\n2\n"
    source.write_bytes(raw)
    router, jobs = build_router()
    dataset = router.dispatch("dataset.open", {"path": str(source)})
    for fmt in ("csv", "parquet"):
        destination = tmp_path / f"out.{fmt}"
        job = router.dispatch(
            f"export.{fmt}",
            {"dataset_id": dataset["dataset_id"], "destination": str(destination)},
        )
        result = finish(jobs, job["job_id"])
        assert result["state"] == "completed"
        reopened = (
            pl.read_csv(destination) if fmt == "csv" else pl.read_parquet(destination)
        )
        assert reopened["x"].to_list() == [1, 2]
    assert source.read_bytes() == raw
    jobs.shutdown()


def test_export_rejects_existing_file_without_confirmation(tmp_path):
    source = tmp_path / "input.csv"
    source.write_text("x\n1\n")
    destination = tmp_path / "out.csv"
    destination.write_text("keep\n")
    router, jobs = build_router()
    dataset = router.dispatch("dataset.open", {"path": str(source)})
    job = router.dispatch(
        "export.csv",
        {"dataset_id": dataset["dataset_id"], "destination": str(destination)},
    )
    assert finish(jobs, job["job_id"])["state"] == "failed"
    assert destination.read_text() == "keep\n"
    jobs.shutdown()


def test_interrupted_export_cleans_temporary_output(tmp_path):
    source = tmp_path / "input.csv"
    source.write_text("x\n1\n")
    router, jobs = build_router()
    dataset = router.dispatch("dataset.open", {"path": str(source)})
    checks = iter([False, False, True])
    try:
        router.exports.export(
            dataset["dataset_id"],
            str(tmp_path / "cancelled.csv"),
            "csv",
            False,
            lambda: next(checks),
        )
    except CancelledError:
        pass
    else:
        raise AssertionError("Interrupted export must report cancellation")
    assert not (tmp_path / "cancelled.csv").exists()
    assert list(tmp_path.glob(".forma-*")) == []
    jobs.shutdown()
