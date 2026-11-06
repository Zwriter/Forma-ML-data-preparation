# IPC Contract Changes: Data Profile Dashboard

Shapes referenced here are defined in [data-model.md](../data-model.md). All new methods validate
their parameters and return `INVALID_REQUEST` for malformed input. Long-running methods return a
job acknowledgement `{ job_id, state }`, and their result arrives through `job.completed`.

## New error code

`PROFILE_STALE` — "The profile is out of date. Refresh it and try again." Raised when a
request's `data_version` does not match the dataset's current entry, or when no profile exists for
that version.

## `dataset.history` and every response that carries `history` (extended)

`history` adds `data_version: string`, the current entry's data version. A sort-only commit keeps
it; any data change gives a new value; undo/redo return the target entry's value.

## `dataset.profile` (changed)

Request: `{ dataset_id: string }`. The old `frequencies` flag is removed (always computed).
Unknown keys are ignored.

Job kind: `profile`. The job emits `job.progress` events with `progress` 0–1 and `message` naming
the phase: "Detecting types", "Computing column statistics", "Finding duplicates", or "Building
distributions". Cancel takes effect at the next phase or batch boundary.

Result: a `Profile` (see data model). Example (trimmed):

```json
{
  "dataset_id": "d1", "history_id": "h1", "data_version": "v7",
  "computed_at": "2026-11-05T10:24:00Z",
  "row_count": 7043, "column_count": 21, "missing_cells": 3218, "duplicate_rows": 14,
  "quality": { "total_cells": 147903, "valid_cells": 144685, "missing_cells": 3218,
               "invalid_cells": 0, "completeness": 0.978 },
  "columns": [
    { "position": 3, "name": "SeniorCitizen", "stored_type": "Int64",
      "detected_type": "integer", "missing_count": 226, "invalid_count": 0,
      "unique_count": 2, "completeness": 0.968, "quality": "needs_attention",
      "examples": ["0", "1"],
      "numeric": { "mean": 0.16, "median": 0, "std": 0.37, "min": 0, "max": 1,
                   "histogram": [{ "start": 0, "end": 0, "count": 5679 },
                                 { "start": 1, "end": 1, "count": 1138 }] },
      "categories": null }
  ]
}
```

The engine keeps this result as the last profile for `history_id` (used by `profile.report`).

## `profile.report` (new)

Request:

```json
{ "dataset_id": "d1", "data_version": "v7", "destination": "C:/out/telco-profile-2026-11-05.html",
  "distribution_column": "MonthlyCharges", "category_column": "Contract",
  "force_overwrite": false }
```

- `distribution_column` / `category_column` are optional (`null` = engine default per FR-019).
  A name without the matching summary returns `INVALID_REQUEST`.
- `destination` must end in `.html`. An existing file without `force_overwrite` returns
  `FILE_ACCESS_ERROR` ("The destination already exists. Confirm overwrite to replace it.").

Job kind: `profile_report`. Result: `{ destination, bytes, replaced_existing }`. The file is
written to a temp file and moved into place, so a cancelled or failed run leaves no file.

## `profile.export_invalid` (new)

Request:

```json
{ "dataset_id": "d1", "data_version": "v7", "column": null,
  "destination": "C:/out/telco_rejected_2026-11-05.csv", "format": "csv",
  "force_overwrite": false }
```

- `column`: `null` exports rows with an invalid cell in any column, or a column name exports
  rows invalid in that column only. An unknown name returns `INVALID_REQUEST`.
- `format`: `csv` or `parquet`.
- `destination` equal to the dataset's source path (after resolving) returns
  `FILE_ACCESS_ERROR` ("Choose a different file; the open source file cannot be replaced.").
- No invalid rows in scope returns `INVALID_REQUEST` ("There are no invalid values to export.").

Job kind: `export_invalid`. Result: the `write_safe` result
(`destination, format, row_count, schema, replaced_existing, validated`) plus
`reason_column: string`. Rows are in stored order; the working data and history are unchanged.

## `job.progress` event (now emitted during work)

`{ event: "job.progress", job_id, kind, state: "running", progress: number, message: string }`.
Existing jobs that do not report keep emitting only the start and finish events.

## Demo mode

`dataset.profile` returns a completed fixture profile immediately. `dataset.history` includes a
fixed `data_version`. `profile.report` and `profile.export_invalid` are not available in demo
mode.
