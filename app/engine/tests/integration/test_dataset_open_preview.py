from forma_engine.services.dataset_service import DatasetService


def test_open_preview_keeps_source_bytes(tmp_path):
    path = tmp_path / "source.csv"
    original = b"x,y\n1,two\n"
    path.write_bytes(original)
    service = DatasetService()
    dataset = service.open(str(path))
    preview = service.preview(dataset["dataset_id"], limit=1)
    assert len(preview["records"]) == 1
    assert path.read_bytes() == original
