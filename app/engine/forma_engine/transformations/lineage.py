"""Track which original column each current column came from across steps."""

Lineage = dict[str, str | None]


def initial_lineage(columns: list[str]) -> Lineage:
    return {name: name for name in columns}


def track(lineage: Lineage, operation: dict) -> Lineage:
    """Return the lineage after operation; new columns map to None."""
    kind, p = operation.get("type"), operation.get("parameters", {})
    if kind == "rename_columns":
        return {
            p["mapping"].get(name, name): origin for name, origin in lineage.items()
        }
    if kind == "drop_columns":
        return {
            name: origin for name, origin in lineage.items() if name not in p["columns"]
        }
    if kind == "split_column":
        removed = {p["column"]} if p["drop_original"] else set()
        return _with_new_columns(lineage, removed, p["into"])
    if kind == "merge_columns":
        removed = set(p["columns"]) if p["drop_sources"] else set()
        return _with_new_columns(lineage, removed, [p["into"]])
    return dict(lineage)


def _with_new_columns(lineage: Lineage, removed: set, new: list[str]) -> Lineage:
    kept = {name: origin for name, origin in lineage.items() if name not in removed}
    return kept | {name: None for name in new}
