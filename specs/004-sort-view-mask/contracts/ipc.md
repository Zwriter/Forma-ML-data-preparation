# IPC Contract Changes: Sort as a Persistent View Mask

`SortKey = { column: string, direction: "ascending" | "descending", nulls: "first" | "last" }`

## `dataset.open` (extended)

Request: `{ path: string, view?: SortKey[] }`

Response adds: `view: SortKey[]` (keys applied) and `dropped_columns: string[]` (keys removed
because the column is missing). Malformed `view` → `INVALID_REQUEST`; unknown columns are
dropped, not rejected.

## `dataset.preview` (extended)

Rows are returned in the current entry's view order; `offset`, `limit`, `columns`, and `search`
apply to the sorted view. Response adds `view: SortKey[]`.

## `cleaning.preview` (extended)

Source rows are paged with rows the draft changes or removes first, then the rest; each group
keeps the current entry's view order. `rows`, `changed_cells`, and markers follow that order.
Response adds `view: SortKey[]` (the view after the draft's lineage mapping). Steps still run on
stored order.

## Preview page size

`dataset.preview` and `cleaning.preview` accept pages of up to 20000 rows (was 500). The desktop
setting "Rows per page" (`forma.page-size`, 500 to 20000, default 500) sets the first page of an
opened file and warns above 5000 rows. The worksheet menu offers 500, 1000, 2000, 3000, and 4000,
plus the setting's size when it differs.

## `data.apply` with `sort_rows` (changed behavior)

Parameters: `{ keys: SortKey[] }`; `keys` may be empty to clear the sort. Commits a history entry
with the same data and the new view; the job result is the usual `{ dataset, history }`.

## `dataset.save` (extended result)

Job result adds `rewritten: boolean` — `false` when only the view changed since the last save
and no file was written — and `view: SortKey[]`, the saved entry's view, which the desktop
remembers for the written path (and the source path on copy saves).

## `export.csv` / `export.parquet`

Unchanged: rows are written in stored order.
