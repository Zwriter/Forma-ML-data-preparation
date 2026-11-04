# IPC Contract: Clean Tab Operations

All methods use the existing request/response envelope. Errors use existing codes
(`INVALID_REQUEST`, `INVALID_TRANSFORMATION`, `DATASET_NOT_FOUND`).

## `cleaning.validate` (new)

Request: `{ dataset_id: string, operations: Operation[] }`

Response:

```json
{
  "valid": false,
  "steps": [
    { "index": 0, "operation_id": "s1", "valid": true },
    { "index": 1, "operation_id": "s2", "valid": false, "message": "Select an existing column." }
  ],
  "columns": [[{ "name": "a", "type": "Int64", "nullable": true }], "…one list per step, plus the result"]
}
```

- `columns[i]` is the schema step `i` sees (after earlier enabled, valid steps); the last entry is
  the schema after every step. Step forms offer these columns (added 2026-11-04).

- `operations` must be a list of objects, else `INVALID_REQUEST`.
- Unsupported types and bad parameters are reported per step, never raised.

## `cleaning.preview` (revised 2026-11-03: one worksheet page)

The Clean-tab worksheet calls this for the page on screen after every draft change and every
page or view change. Paging, projection, and search mirror `dataset.preview` so the Data and
Clean worksheets share one view state.

Request:

```json
{
  "dataset_id": "d1",
  "operations": [],
  "offset": 0,
  "limit": 100,
  "columns": ["customerID", "TotalCharges"],
  "search": "Romania"
}
```

| Field | Rules |
|-------|-------|
| `operations` | List of operation objects, else `INVALID_REQUEST`. Disabled steps are skipped. |
| `offset` | Integer ≥ 0, default 0. Pages over **source** rows so removed rows keep their place. |
| `limit` | Integer 1–500, default 100. |
| `columns` | Optional list of **source** column names (the Data-tab visible columns, in order). Result columns are shown when their lineage origin is listed; columns added by steps are always shown, after the listed columns. Omitted = all columns. |
| `search` | Optional string; filters source rows exactly as `dataset.preview` does, before paging. |

Legacy `{ operation: Operation }` is still accepted and treated as `operations: [operation]`.

Response:

```json
{
  "columns": [
    { "name": "TotalCharges", "type": "Float64", "nullable": true, "origin": "TotalCharges" },
    { "name": "first_name", "type": "String", "nullable": true, "origin": null }
  ],
  "rows": [
    { "values": { "TotalCharges": 29.85, "first_name": "Ana" }, "removed": false },
    { "values": { "TotalCharges": null, "first_name": "Dan" }, "removed": true }
  ],
  "changed_cells": [{ "row": 0, "column": "TotalCharges", "before": null }],
  "offset": 0,
  "limit": 100,
  "total_count": 7043,
  "summary": {
    "rows_before": 7043, "rows_after": 7029, "rows_removed": 14, "values_changed": 86,
    "columns_added": ["first_name"], "columns_removed": [], "columns_renamed": []
  }
}
```

- `rows` follow source order for the requested page. A surviving row carries its values after
  all enabled steps; a removed row carries its source values mapped to result column names and
  `removed: true`.
- `columns` is the result schema after projection; `origin` is the lineage source name or `null`
  for columns added by steps. Columns removed by steps are absent.
- `changed_cells.row` indexes `rows`; values are compared as text (`"1"` → `1` is unchanged).
  `before` is the source value, so the worksheet shows `before → new` (added 2026-11-04).
  Missing cells need no marker: the UI marks `null` values itself.
- `total_count` is the number of source rows after `search`, for worksheet paging.
- `summary` covers the full dataset and ignores `offset`, `limit`, `columns`, and `search`. The
  Clean tab does not display it (spec revision 2026-11-03); it stays for tests and later use.
- With no enabled steps the response is the source page with no changes and zero removed or
  changed counts in the summary.
- Invalid steps raise `INVALID_TRANSFORMATION` with message prefix `Step N: ` and
  `details: { "step": N-1 }` (index into the submitted list).

## `cleaning.apply` (unchanged)

Request `{ dataset_id, operations }` → job acknowledgement. Job kind `clean`; completion result
`{ dataset, history }` creates exactly one history entry. `job.cancel` stops it without a
history entry.
