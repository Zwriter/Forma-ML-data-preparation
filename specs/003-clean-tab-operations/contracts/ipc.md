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
  ]
}
```

- `operations` must be a list of objects, else `INVALID_REQUEST`.
- Unsupported types and bad parameters are reported per step, never raised.

## `cleaning.preview` (extended)

Request: `{ dataset_id, operations: Operation[], limit?: int (1–500, default 100) }`.
Legacy `{ operation: Operation }` is still accepted and treated as `operations: [operation]`.

Response:

```json
{
  "columns_before": [{ "name": "x", "type": "Int64", "nullable": true }],
  "columns": [{ "name": "x", "type": "Int64", "nullable": true }],
  "before": [{ "x": null }, { "x": 2 }, { "x": 2 }],
  "after": [{ "x": 0 }, { "x": 2 }],
  "removed_rows": [2],
  "changed_cells": [{ "row": 0, "column": "x" }],
  "summary": {
    "rows_before": 3, "rows_after": 2, "rows_removed": 1, "values_changed": 1,
    "columns_added": [], "columns_removed": [], "columns_renamed": []
  },
  "validation": { "valid": true }
}
```

- `summary` covers the full dataset. `values_changed` counts cells that differ (compared as
  text, so `"1"` → `1` is unchanged) in rows that survive all steps; removed rows count only
  toward `rows_removed`.
- Invalid steps raise `INVALID_TRANSFORMATION` with message prefix `Step N: ` and
  `details: { "step": N-1 }` (index into the submitted list).

## `cleaning.apply` (unchanged)

Request `{ dataset_id, operations }` → job acknowledgement. Job kind `clean`; completion result
`{ dataset, history }` creates exactly one history entry. `job.cancel` stops it without a
history entry.
