# Forma MVP Data Model

## Dataset Reference

Represents a validated local source dataset held by the engine.

| Field | Type | Rules |
| --- | --- | --- |
| `dataset_id` | Identifier | Unique for the active engine session; required in IPC requests |
| `source_path` | Local path | Must exist and be readable; source is not modified by default |
| `format` | Enum | `csv` or `parquet` |
| `columns` | Integer | Non-negative; reflects the discovered schema |
| `rows` | Integer or unknown | Non-negative when known; may be pending or unknown |
| `schema` | Collection | Column name, type, nullability, and order |
| `state` | Enum | `open`, `closed`, or `invalid` |

A dataset reference owns the relationship to previews, profile reports, transformations, and
jobs. Closing a reference makes subsequent operations fail with an actionable error.

## Dataset Preview

A bounded view returned to the frontend.

| Field | Type | Rules |
| --- | --- | --- |
| `dataset_id` | Identifier | Must reference an open dataset or a derived preview |
| `columns` | Collection | Matches the requested schema projection |
| `records` | Collection | Contains no more than the requested bounded limit |
| `offset` | Integer | Non-negative |
| `limit` | Integer | Positive and capped by an engine-defined maximum |
| `total_count` | Integer or unknown | Must not be fabricated when expensive or unavailable |

The preview never represents permission to transfer the complete source dataset.

## Profile Report

Contains quality statistics for an open dataset or derived result.

| Field | Type | Rules |
| --- | --- | --- |
| `dataset_id` | Identifier | Dataset being profiled |
| `row_count` | Integer or unknown | Non-negative when known |
| `column_count` | Integer | Non-negative |
| `missing_counts` | Map | One non-negative count per applicable column |
| `distinct_counts` | Map | One non-negative count per applicable column |
| `type_summary` | Map | Discovered type per column |
| `numeric_summaries` | Map | Only for numeric columns; values identify unavailable measures |
| `categorical_frequencies` | Map | Only when requested and applicable |
| `duplicate_count` | Integer or unknown | Non-negative when calculated |

Statistics may be incomplete while a profile job is pending. The UI must distinguish pending,
unknown, and zero values.

## Transformation

A declarative, validated cleaning action.

| Field | Type | Rules |
| --- | --- | --- |
| `operation_id` | Identifier | Unique within the operation list |
| `type` | Enum | `drop_duplicates`, `drop_null_rows`, `fill_null`, `rename_columns`, `drop_columns`, `convert_type`, or `filter_rows` |
| `parameters` | Object | Must satisfy the type-specific schema; `fill_null` supports `constant`, `mean`, `median`, or `mode`, and `filter_rows` uses only the declared safe expression grammar |
| `enabled` | Boolean | Disabled operations are retained for review but not executed |
| `order` | Integer | Unique execution order |

Transformations execute sequentially against a derived working result. Invalid parameters stop
execution before a misleading success state is produced. The source reference remains intact.

`filter_rows` expressions may contain only column references, literal values, comparison
operators (`==`, `!=`, `<`, `<=`, `>`, `>=`), null checks, parentheses, and boolean `AND`/`OR`.
They are parsed as data, never evaluated as executable code. `fill_null` requires a replacement
value for `constant`, a numeric column for `mean` and `median`, and at least one non-missing
value for `mode`.

## Processing Job

Tracks work that may outlive one request-response exchange.

| Field | Type | Rules |
| --- | --- | --- |
| `job_id` | Identifier | Unique for the engine session |
| `kind` | Enum | `profile`, `clean`, or `export` |
| `state` | Enum | `pending` -> `running` -> `completed`, `failed`, or `cancelled` |
| `progress` | Number or null | Between 0 and 1 when measurable; null when indeterminate |
| `message` | Text | User-readable current status |
| `result` | Object or null | Present only on completion |
| `error` | Error or null | Present only on failure |
| `cancel_requested` | Boolean | Cooperative cancellation signal |

Terminal states are immutable except for adding diagnostic metadata.

## Export Result

Represents a validated output file.

| Field | Type | Rules |
| --- | --- | --- |
| `destination` | Local path | Must be selected by the user and writable |
| `format` | Enum | `csv` or `parquet` |
| `row_count` | Integer | Must match the written result when available |
| `schema` | Collection | Must match the exported result |
| `replaced_existing` | Boolean | True only after explicit overwrite confirmation |
| `validated` | Boolean | True only after successful post-write validation |

A failed or cancelled export must not be reported as a validated completed output.

## Relationships and Lifecycle

```text
Dataset Reference
    ├── Dataset Preview (bounded, many)
    ├── Profile Report (zero or many)
    ├── Transformation list (zero or one active working result)
    ├── Processing Job (many)
    └── Export Result (zero or many)
```

The normal lifecycle is `validate -> open -> preview/profile -> transform -> compare -> export`.
A failed transformation preserves the last valid working result. A cancelled job preserves the
source and last valid result. Closing a dataset prevents new work but does not delete exported
files.
