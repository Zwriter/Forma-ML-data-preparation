from forma_engine.transformations.lineage import initial_lineage, track


def step(kind: str, **parameters) -> dict:
    return {"type": kind, "parameters": parameters}


def test_initial_lineage_maps_each_column_to_itself():
    assert initial_lineage(["a", "b"]) == {"a": "a", "b": "b"}


def test_rename_rekeys_and_chains_to_original_name():
    lineage = initial_lineage(["a", "b"])
    lineage = track(lineage, step("rename_columns", mapping={"a": "x"}))
    lineage = track(lineage, step("rename_columns", mapping={"x": "y"}))
    assert lineage == {"y": "a", "b": "b"}


def test_drop_columns_removes_entries():
    lineage = track(initial_lineage(["a", "b"]), step("drop_columns", columns=["a"]))
    assert lineage == {"b": "b"}


def test_split_adds_new_columns_and_optionally_drops_original():
    lineage = track(
        initial_lineage(["name"]),
        step("split_column", column="name", into=["f", "l"], drop_original=False),
    )
    assert lineage == {"name": "name", "f": None, "l": None}
    lineage = track(
        initial_lineage(["name"]),
        step("split_column", column="name", into=["name", "l"], drop_original=True),
    )
    assert lineage == {"name": None, "l": None}


def test_merge_adds_new_column_and_optionally_drops_sources():
    lineage = track(
        initial_lineage(["a", "b", "c"]),
        step("merge_columns", columns=["a", "b"], into="ab", drop_sources=True),
    )
    assert lineage == {"c": "c", "ab": None}


def test_value_operations_do_not_change_lineage():
    lineage = initial_lineage(["a"])
    assert track(lineage, step("fill_null", column="a", strategy="previous")) == lineage
