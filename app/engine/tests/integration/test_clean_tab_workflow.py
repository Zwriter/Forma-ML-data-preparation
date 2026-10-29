from pathlib import Path

from forma_engine.bootstrap import build_router
from tests.integration.test_profile_clean_workflow import wait_for

FIXTURE = Path(__file__).parents[3] / "fixtures" / "clean-tab-operations.csv"

STEPS = [
    {
        "operation_id": "fill",
        "type": "fill_null",
        "parameters": {"column": "TotalCharges", "strategy": "median"},
    },
    {"operation_id": "dedupe", "type": "drop_duplicates", "parameters": {}},
    {
        "operation_id": "replace",
        "type": "replace_values",
        "parameters": {
            "columns": ["Churn"],
            "find": "n/a",
            "replace": None,
            "match": "whole",
            "case_sensitive": False,
        },
    },
    {
        "operation_id": "split",
        "type": "split_column",
        "parameters": {
            "column": "full_name",
            "separator": " ",
            "into": ["first_name", "last_name"],
            "drop_original": True,
        },
    },
    {
        "operation_id": "merge",
        "type": "merge_columns",
        "parameters": {
            "columns": ["city", "country"],
            "separator": ", ",
            "into": "location",
            "drop_sources": True,
        },
    },
    {
        "operation_id": "convert",
        "type": "convert_type",
        "parameters": {"column": "SeniorCitizen", "to": "boolean"},
    },
]


def test_multi_step_clean_is_one_undoable_change_and_keeps_source(tmp_path):
    path = tmp_path / "churn.csv"
    original = FIXTURE.read_bytes()
    path.write_bytes(original)
    router, jobs = build_router()
    try:
        opened = router.dispatch("dataset.open", {"path": str(path)})
        dataset_id = opened["dataset_id"]
        checked = router.dispatch(
            "cleaning.validate", {"dataset_id": dataset_id, "operations": STEPS}
        )
        assert checked["valid"] is True

        preview = router.dispatch(
            "cleaning.preview", {"dataset_id": dataset_id, "operations": STEPS}
        )
        assert preview["summary"]["rows_removed"] == 1
        assert preview["summary"]["columns_added"] == [
            "first_name",
            "last_name",
            "location",
        ]

        ack = router.dispatch(
            "cleaning.apply", {"dataset_id": dataset_id, "operations": STEPS}
        )
        result = wait_for(jobs, ack["job_id"], {"completed"})["result"]
        cleaned_id = result["dataset"]["dataset_id"]
        assert result["history"]["current_index"] == 1
        assert result["history"]["is_dirty"] is True

        rows = router.dispatch("dataset.preview", {"dataset_id": cleaned_id})["records"]
        assert len(rows) == 7
        assert rows[2]["TotalCharges"] == 56.95
        assert rows[3]["Churn"] is None
        assert rows[5]["first_name"] == "Radu"
        assert rows[5]["last_name"] == "Marin Ilie"
        assert rows[3]["location"] == ", Romania"
        assert rows[3]["SeniorCitizen"] is True

        undo = router.dispatch("dataset.undo", {"dataset_id": cleaned_id})
        restored = wait_for(jobs, undo["job_id"], {"completed"})["result"]
        assert restored["history"]["current_index"] == 0
        assert restored["dataset"]["rows"] == 8
        assert path.read_bytes() == original
    finally:
        jobs.shutdown()
