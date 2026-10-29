# Data Tab Operations IPC Contract

This feature extends the existing newline-delimited JSON request/response and event protocol.
All requests use the existing envelope and all asynchronous methods return a job acknowledgement.
The engine continues to return bounded previews and metadata only.

## Existing Envelope

```json
{
  "id": "req-001",
  "method": "data.apply",
  "params": {}
}
```

A successful immediate response is:

```json
{
  "id": "req-001",
  "status": "success",
  "result": { "job_id": "job-001", "state": "pending" },
  "error": null
}
```

## `dataset.history`

Returns current workspace history metadata for `dataset_id`.

Request params:

```json
{ "dataset_id": "source-id" }
```

Result:

```json
{
  "history_id": "history-001",
  "dataset_id": "derived-id",
  "current_index": 2,
  "saved_index": 1,
  "is_dirty": true,
  "can_undo": true,
  "can_redo": false
}
```

## `data.apply`

Queues one validated data-tab operation against the current working state.

Request params:

```json
{
  "dataset_id": "current-id",
  "operation": {
    "type": "sort_rows",
    "parameters": {
      "keys": [
        { "column": "region", "direction": "ascending", "nulls": "last" },
        { "column": "revenue", "direction": "descending", "nulls": "last" }
      ]
    }
  }
}
```

Supported operation types and parameter shapes are defined in [data-model.md](../data-model.md):
`filter_rows`, `sort_rows`, `group_by`, `pivot`, and `unpivot`. The handler rejects unknown
columns, duplicate role assignments, invalid value types, unsupported aggregations, empty
selections, and malformed objects before queueing work.

A completed job result includes:

```json
{
  "dataset": {
    "dataset_id": "derived-id",
    "source_path": "C:/data/example.csv",
    "format": "csv",
    "schema": [],
    "columns": 3,
    "rows": 42,
    "state": "open"
  },
  "history": {
    "history_id": "history-001",
    "current_index": 2,
    "saved_index": 1,
    "is_dirty": true,
    "can_undo": true,
    "can_redo": false
  }
}
```

## `dataset.undo` and `dataset.redo`

Queue movement of the current history cursor.

Request params:

```json
{ "dataset_id": "current-id" }
```

The operation fails with a stable validation error when the corresponding history direction is
empty. Completion returns the selected `dataset` and `history` objects. Undo and redo do not
modify the saved file or the saved cursor.

## `dataset.save`

Queues a safe save of the current working state to its active source path.

Request params:

```json
{
  "dataset_id": "current-id",
  "force_overwrite": true
}
```

The handler rejects `force_overwrite: false` when the target exists, and the UI must obtain
explicit replacement confirmation before retrying with true. Completion returns:

```json
{
  "destination": "C:/data/example.csv",
  "format": "csv",
  "row_count": 42,
  "schema": [],
  "replaced_existing": true,
  "validated": true,
  "history": {
    "current_index": 2,
    "saved_index": 2,
    "is_dirty": false,
    "can_undo": true,
    "can_redo": false
  }
}
```

The write must use the existing safe temporary-file, validation, and replacement behavior. A
failure or cancellation leaves the file and saved cursor unchanged.

## `dataset.preview` Extension

The existing preview request continues to accept a bounded `columns` projection. The frontend
uses the confirmed Column Selection list for that projection. Projection changes do not create
history entries or dirty state.

## Error Codes

Existing stable codes remain applicable. Add or reuse these meanings:

| Code | Meaning |
| --- | --- |
| `INVALID_DATA_OPERATION` | Operation type or parameters are invalid |
| `HISTORY_BOUNDARY` | Undo or redo was requested where no state exists |
| `SAVE_REQUIRED` | Save was requested without explicit overwrite approval for an existing target |
| `SAVE_FAILED` | Working state could not be safely written and validated |

The engine must never expose executable filter text or internal exception details in a user-facing
error. Job failures use the existing structured error envelope and events.
