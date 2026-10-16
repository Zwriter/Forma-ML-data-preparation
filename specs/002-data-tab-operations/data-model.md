# Data Tab Operations Data Model

## Dataset Working State

Represents the active dataset as the user edits it.

| Field | Type | Rules |
| --- | --- | --- |
| `dataset_id` | Identifier | Identifies the current derived state returned through IPC |
| `source_path` | Local path | Original active file location; Save targets this path |
| `format` | Enum | `csv` or `parquet`; remains compatible with the source |
| `schema` | Collection | Ordered names, types, and nullability for the current state |
| `rows` | Integer or unknown | Non-negative when known; may be pending for expensive results |
| `state` | Enum | `open`, `closed`, or `invalid` |
| `history_id` | Identifier | Identifies the per-open-dataset working history |

## Change History

Owns reversible working states for one open source dataset.

| Field | Type | Rules |
| --- | --- | --- |
| `history_id` | Identifier | Unique for one loaded source dataset |
| `states` | Ordered collection | Starts with the opened source state and contains successful derived states |
| `current_index` | Integer | Points to the current working state; always within `states` |
| `saved_index` | Integer | Points to the last successful save; may differ from `current_index` |
| `can_undo` | Boolean | True when `current_index` is greater than the initial state index |
| `can_redo` | Boolean | True when a later state exists after the current cursor |
| `is_dirty` | Boolean | True when `current_index` differs from `saved_index` |

A successful new operation after Undo removes or invalidates states after the current cursor.
Loading a new source creates a new history. A failed or cancelled operation does not add a
state. Saving updates `saved_index` only after safe write and validation succeed.

## Working State Entry

Represents one complete engine-side lazy frame plus user-visible metadata.

| Field | Type | Rules |
| --- | --- | --- |
| `dataset_id` | Identifier | Unique state reference |
| `operation` | Object or null | The validated operation that produced this state; null for the source |
| `frame` | Engine frame | Retained in the processing layer; never serialized to the frontend |
| `schema` | Collection | Derived from the frame |
| `rows` | Integer or unknown | Derived when practical |
| `preview` | Bounded records | Returned only through the preview contract |

## Column Selection

A frontend view selection, not a dataset mutation.

| Field | Type | Rules |
| --- | --- | --- |
| `columns` | Ordered list of names | Must contain existing columns and at least one name when confirmed |
| `search` | Text | Filters the popup list only; does not alter data |
| `select_all` / `clear_all` | Action | Updates draft selection before confirmation |

## Filter Rule Set

A typed, non-code rule set applied to the full working dataset.

| Field | Type | Rules |
| --- | --- | --- |
| `mode` | Enum | `all` or `any` |
| `rules` | Ordered list | Must contain at least one valid rule |
| `column` | Column name | Must exist in the current schema |
| `operator` | Enum | `equals`, `not_equals`, `contains`, `begins_with`, `ends_with`, `greater_than`, `less_than`, `at_least`, `at_most`, `is_empty`, `is_not_empty` |
| `value` | Scalar or null | Required except for empty checks; validated against the selected column type |
| `case_sensitive` | Boolean or omitted | Applies to text matching; default is false |

## Sort Specification

An ordered multi-key sort.

| Field | Type | Rules |
| --- | --- | --- |
| `keys` | Ordered list | Must contain at least one key and no duplicate columns |
| `column` | Column name | Must exist in the current schema |
| `direction` | Enum | `ascending` or `descending` |
| `nulls` | Enum | Explicit, consistent placement such as `first` or `last` |

## Grouped Summary

A result with one row per distinct grouping combination.

| Field | Type | Rules |
| --- | --- | --- |
| `group_columns` | Ordered list | Must contain existing, unique columns |
| `aggregations` | Ordered list | Must contain at least one request |
| `column` | Column name or null | Required for value aggregates; optional for count rows |
| `function` | Enum | `count`, `sum`, `average`, `minimum`, or `maximum` |
| `output_name` | Text | Non-empty and unique in the result schema |

Numeric compatibility is required for `sum`, `average`, `minimum`, and `maximum` where the
selected column type does not support the requested calculation.

## Pivot Specification

A cross-tabulation result.

| Field | Type | Rules |
| --- | --- | --- |
| `row_columns` | Ordered list | Existing columns used as row labels |
| `category_column` | Column name | Existing and distinct from the value column |
| `value_column` | Column name | Existing and compatible with the selected aggregation |
| `function` | Enum | `count`, `sum`, `average`, `minimum`, or `maximum` |

Repeated row/category intersections are combined using the selected function. Generated category
columns receive stable, understandable names.

## Unpivot Specification

A wide-to-long reshape result.

| Field | Type | Rules |
| --- | --- | --- |
| `identifier_columns` | Ordered list | Existing columns retained as identifiers; may be empty only if explicitly supported by validation |
| `value_columns` | Ordered list | At least one existing column, excluding identifier columns |
| `attribute_name` | Text | Non-empty output column name not colliding with identifiers |
| `value_name` | Text | Non-empty output column name not colliding with identifiers or attribute name |

Each selected value column produces an attribute-value row while retaining identifier values.

## Save State and Operation Job

Save and data changes use the existing job lifecycle (`pending`, `running`, `completed`,
`failed`, `cancelled`). A completion result includes the selected working state and history
metadata. A save completion also includes destination, format, row count, schema, validation,
and replacement status. Failed or cancelled jobs do not advance the history cursor or saved
cursor.
