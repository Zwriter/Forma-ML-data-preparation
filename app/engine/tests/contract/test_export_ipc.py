from forma_engine.bootstrap import build_router

def test_export_acknowledges_job_and_exposes_status(tmp_path):
    source = tmp_path / "data.csv"; source.write_text("x\n1\n")
    router, jobs = build_router()
    opened = router.dispatch("dataset.open", {"path":str(source)})
    ack = router.dispatch("export.csv", {"dataset_id":opened["dataset_id"],"destination":str(tmp_path / "out.csv"),"force_overwrite":False})
    assert ack["job_id"]
    assert router.dispatch("job.status", {"job_id":ack["job_id"]})["state"] in {"pending", "running", "completed"}
    jobs.shutdown()
