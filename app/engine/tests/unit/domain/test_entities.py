import pytest
from forma_engine.domain.entities import (
    Dataset,
    DatasetPreview,
    ExportResult,
    Job,
    JobState,
    Transformation,
)


def test_dataset_rejects_unsupported_format():
    with pytest.raises(ValueError):
        Dataset("x", "json", [], None)


def test_job_terminal_states_cannot_transition():
    job = Job("profile")
    job.transition(JobState.RUNNING)
    job.transition(JobState.COMPLETED)
    with pytest.raises(ValueError):
        job.transition(JobState.FAILED)


@pytest.mark.parametrize("offset,limit", [(-1, 10), (0, 0), (0, 501)])
def test_preview_enforces_bounds(offset, limit):
    with pytest.raises(ValueError):
        DatasetPreview("d1", [], [], offset, limit)


def test_transformation_requires_supported_type_and_order():
    with pytest.raises(ValueError):
        Transformation("execute_python", {}, order=-1)


def test_export_result_requires_validation_and_supported_format():
    with pytest.raises(ValueError):
        ExportResult("out.csv", "csv", -1, [], False, True)


def test_job_supports_nullable_indeterminate_progress():
    job = Job("profile", progress=None)
    assert job.progress is None
