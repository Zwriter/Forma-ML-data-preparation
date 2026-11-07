"""US7–US8 through IPC: profile a file, use each tool, then act on a finding."""

import time

import polars as pl
import pytest

from forma_engine.bootstrap import build_router
from forma_engine.domain.errors import ProfileStaleError


def finished(jobs, job_id):
    for _ in range(1000):
        status = jobs.status(job_id)
        if status["state"] in {"completed", "failed", "cancelled"}:
            return status
        time.sleep(0.01)
    raise AssertionError("job did not finish")


@pytest.fixture
def profile_file(write_csv):
    """Opens and profiles a frame as a CSV; returns a runner for tool methods."""
    router, jobs = build_router()

    def open_profiled(frame, name="data.csv"):
        path = write_csv(frame, name)
        dataset_id = router.dispatch("dataset.open", {"path": str(path)})["dataset_id"]
        ack = router.dispatch("dataset.profile", {"dataset_id": dataset_id})
        version = finished(jobs, ack["job_id"])["result"]["data_version"]
        base = {"dataset_id": dataset_id, "data_version": version}

        def run(method, **params):
            status = finished(jobs, router.dispatch(method, base | params)["job_id"])
            assert status["state"] == "completed", status
            return status["result"]

        return dataset_id, base, run, pl.read_csv(path, try_parse_dates=True)

    yield router, jobs, open_profiled
    jobs.shutdown()


@pytest.fixture
def profiled(profile_file, mixed_frame):
    router, jobs, open_profiled = profile_file
    dataset_id, _, run, frame = open_profiled(mixed_frame, "mixed.csv")
    return router, jobs, dataset_id, run, frame


def test_investigate_tools_match_references(profiled):
    _, _, _, run, frame = profiled

    detail = run("profile.column_detail", column="price")
    prices = frame["price"].drop_nulls()
    assert detail["quartiles"]["median"] == prices.median()
    assert detail["column"]["missing_count"] == frame["price"].null_count()
    amount = run("profile.column_detail", column="amount")
    assert [item["value"] for item in amount["invalid_values"]] == ["12,5", "n/a"]

    page = run("profile.rows", filter={"kind": "problems", "column": "price"}, limit=5)
    nulls = frame.with_row_index("row", 1).filter(pl.col("price").is_null())
    assert page["total"] == nulls.height
    assert [row["row"] for row in page["rows"]] == nulls["row"].head(5).to_list()

    distribution = run("profile.distribution", column="price", bins=10)
    assert len(distribution["bins"]) == 10
    assert sum(b["count"] for b in distribution["bins"]) == prices.len()
    assert distribution["box"]["median"] == prices.median()

    duplicates = run("profile.duplicates", columns=None)
    assert duplicates["duplicate_rows"] == frame.height - frame.n_unique()


def test_removing_found_duplicates_applies_and_makes_tools_out_of_date(profiled):
    router, jobs, dataset_id, run, frame = profiled
    found = run("profile.duplicates", columns=["name"])
    assert found["duplicate_rows"] == frame.height - frame["name"].n_unique()

    step = {"type": "drop_duplicates", "parameters": {"columns": ["name"]}}
    ack = router.dispatch(
        "cleaning.apply", {"dataset_id": dataset_id, "operations": [step]}
    )
    cleaned = finished(jobs, ack["job_id"])["result"]
    assert cleaned["dataset"]["rows"] == frame["name"].n_unique()

    with pytest.raises(ProfileStaleError):
        run("profile.duplicates", columns=["name"])


def test_patterns_and_anomalies_match_references(profile_file, tools_frame):
    _, _, open_profiled = profile_file
    _, _, run, frame = open_profiled(tools_frame, "tools.csv")

    patterns = run("profile.patterns")
    correlation = patterns["correlation"]
    x, y = correlation["columns"].index("x"), correlation["columns"].index("y")
    expected = frame.select(pl.corr("x", "y")).item()
    assert abs(correlation["matrix"][x][y] - expected) < 1e-9
    assert {"x", "y"} in [{pair["a"], pair["b"]} for pair in correlation["strongest"]]
    phone = next(f for f in patterns["formats"] if f["column"] == "phone")
    assert phone["formats"][0] == {"shape": "999-9999", "count": 90, "share": 0.9}

    anomalies = run("profile.anomalies")["columns"]
    assert anomalies[0]["column"] == "spend" and anomalies[0]["count"] == 2

    page = run("profile.rows", filter={"kind": "outliers", "column": "spend"})
    assert page["total"] == anomalies[0]["count"]
    assert [row["row"] for row in page["rows"]] == [14, 58]


def test_cancelling_patterns_on_a_large_file_returns_nothing(profile_file):
    router, jobs, open_profiled = profile_file
    rows = 1_000_000
    frame = pl.DataFrame(
        {
            "a": [i * 0.5 for i in range(rows)],
            "b": [(i * 37) % 1001 for i in range(rows)],
            "code": [f"C-{i % 977}" for i in range(rows)],
        }
    )
    _, base, _, _ = open_profiled(frame, "large.csv")

    ack = router.dispatch("profile.patterns", base)
    router.dispatch("job.cancel", {"job_id": ack["job_id"]})
    status = finished(jobs, ack["job_id"])

    assert status["state"] == "cancelled"
    assert status.get("result") is None
