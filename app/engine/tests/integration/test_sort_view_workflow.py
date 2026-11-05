import time

import polars as pl

from forma_engine.bootstrap import build_router


def finish(jobs, job_id):
    for _ in range(300):
        status = jobs.status(job_id)
        if status["state"] in {"completed", "failed", "cancelled"}:
            return status
        time.sleep(0.01)
    raise AssertionError("Job did not finish")


def run(router, jobs, method, params):
    status = finish(jobs, router.dispatch(method, params)["job_id"])
    assert status["state"] == "completed", status
    return status["result"]


def test_sort_then_clean_then_save_copy_and_export_keep_stored_order(tmp_path):
    source = tmp_path / "people.csv"
    source.write_text("id,city,n\n1,b,\n2,z,5\n3,a,\n4,z,7\n", encoding="utf-8")
    router, jobs = build_router()
    try:
        dataset_id = router.dispatch("dataset.open", {"path": str(source)})[
            "dataset_id"
        ]
        keys = [{"column": "city", "direction": "descending", "nulls": "last"}]
        sorted_id = run(
            router,
            jobs,
            "data.apply",
            {
                "dataset_id": dataset_id,
                "operation": {"type": "sort_rows", "parameters": {"keys": keys}},
            },
        )["dataset"]["dataset_id"]
        fill = {
            "type": "fill_null",
            "parameters": {"column": "n", "strategy": "previous"},
        }
        cleaned_id = run(
            router,
            jobs,
            "cleaning.apply",
            {"dataset_id": sorted_id, "operations": [fill]},
        )["dataset"]["dataset_id"]

        shown = router.dispatch("dataset.preview", {"dataset_id": cleaned_id})
        assert [row["id"] for row in shown["records"]] == [2, 4, 1, 3]

        copy = tmp_path / "copy.csv"
        run(
            router,
            jobs,
            "dataset.save",
            {"dataset_id": cleaned_id, "destination": str(copy)},
        )
        exported = tmp_path / "export.csv"
        run(
            router,
            jobs,
            "export.csv",
            {"dataset_id": cleaned_id, "destination": str(exported)},
        )
    finally:
        jobs.shutdown()

    for written in (copy, exported):
        frame = pl.read_csv(written)
        assert frame["id"].to_list() == [1, 2, 3, 4]
        assert frame["n"].to_list() == [None, 5, 5, 7]
