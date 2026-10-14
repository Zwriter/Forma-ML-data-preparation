# Forma MVP IPC Contract

## Transport

The Tauri runtime and Python sidecar exchange newline-delimited JSON over standard input and
output. Each line is exactly one JSON object. Standard output is reserved for protocol messages;
diagnostics belong in structured logs or standard error.

## Request Envelope

```json
{
  "id": "req-001",
  "method": "dataset.open",
  "params": {}
}
```

Rules:

- `id` is a non-empty request identifier and is echoed in the final response.
- `method` is a supported namespaced operation.
- `params` is an object validated against the method schema.
- Unknown methods and malformed envelopes return structured errors without terminating the
  sidecar.

## Response Envelope

```json
{
  "id": "req-001",
  "status": "success",
  "result": {},
  "error": null
}
```

`status` is `success` or `error`. A successful response has a result; an error has an error
object with a stable code, user-readable message, and optional details. Errors must not expose
secrets or arbitrary local paths beyond what the user supplied.

## Event Envelope

```json
{
  "event": "job.progress",
  "job_id": "job-001",
  "state": "running",
  "progress": 0.65,
  "message": "Writing output"
}
```

Events are unsolicited and do not contain a request ID. `progress` is null for indeterminate
work. Terminal events use `job.completed`, `job.failed`, or `job.cancelled` and include the
corresponding result or error.

## Methods

### `dataset.open`

Request params: `path`.

Success result: dataset reference metadata including `dataset_id`, format, schema, column count,
and row count when available. Validates supported format, existence, readability, and schema.

### `dataset.preview`

Request params: `dataset_id`, `offset`, `limit`, and optional column projection.

Success result: bounded preview with columns, records, offset, limit, and total count when known.
The engine caps `limit` and never returns the complete source solely because a larger limit was
requested.

### `dataset.profile`

Request params: `dataset_id` and optional profile options.

Success response acknowledges a job. Events report progress or indeterminate state, then return
profile report data on completion.

### `cleaning.preview`

Request params: `dataset_id` and one validated transformation.

Success result: bounded before and after previews plus validation details. This operation has no
persistent side effect.

For `fill_null`, parameters MUST identify one of `constant`, `mean`, `median`, or `mode` and
include a replacement value for `constant`. For `filter_rows`, the expression MUST contain only
column references, literal values, comparison operators, null checks, parentheses, and boolean
`AND`/`OR`. The sidecar MUST reject malformed expressions, unknown columns, unsupported
operators, and executable code before evaluation.

### `cleaning.apply`

Request params: `dataset_id` and an ordered list of transformations.

Success response acknowledges a job. The job applies enabled transformations sequentially to a
derived working result, preserves the source, and reports a completed derived dataset reference
or a structured failure.

The same `fill_null` and `filter_rows` parameter constraints as `cleaning.preview` apply to every
operation in the ordered list.

### `export.csv` and `export.parquet`

Request params: `dataset_id`, `destination`, and `force_overwrite`.

Success response acknowledges an export job. The job writes safely, validates the output, and
reports an export result. Existing destinations are rejected unless explicit overwrite is true.

### `job.status`

Request params: `job_id`.

Success result: current job state, progress, message, and terminal result or error where present.

### `job.cancel`

Request params: `job_id`.

Success result: cancellation acknowledgement. Cancellation is cooperative; a job that already
reached a terminal state returns its existing state instead of claiming cancellation.

## Stable Error Codes

| Code | Meaning |
| --- | --- |
| `INVALID_REQUEST` | Envelope or parameter schema is invalid |
| `UNSUPPORTED_FORMAT` | File format is not CSV or Parquet |
| `FILE_ACCESS_ERROR` | File is missing, unreadable, or destination is not writable |
| `INVALID_DATASET` | Dataset structure or schema is invalid |
| `DATASET_NOT_FOUND` | Dataset ID is unknown or closed |
| `INVALID_TRANSFORMATION` | Cleaning operation parameters are invalid |
| `JOB_NOT_FOUND` | Job ID is unknown |
| `CANCELLED` | Operation ended through cooperative cancellation |
| `EXPORT_FAILED` | Output could not be safely written or validated |
| `INTERNAL_ERROR` | Unexpected failure; details are logged without leaking internals |

All methods are subject to bounded payload, source-preservation, local-processing, and input
validation requirements from the feature specification.
