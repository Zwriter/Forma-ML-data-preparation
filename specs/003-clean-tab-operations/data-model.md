# Data Model: Clean Tab Operations

## CleaningStep (frontend draft, engine operation)

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | Frontend-only, unique in draft; sent as `operation_id` |
| `type` | enum | `fill_null`, `replace_values`, `convert_type`, `split_column`, `merge_columns`, `drop_duplicates`, `drop_null_rows`, `drop_columns`, `rename_columns` |
| `parameters` | object | Per-type schema below |
| `enabled` | boolean | Disabled steps are skipped by validate, preview, apply |
| `order` | int ≥ 0 | Derived from list position when sent |

### Parameters per type

| Type | Parameters |
|------|-----------|
| `fill_null` | `column`, `strategy`: `constant`\|`mean`\|`median`\|`mode`\|`previous`\|`next`, `value` (constant only) |
| `replace_values` | `columns[≥1]`, `find` (string), `replace` (string \| null), `match`: `whole`\|`contains`, `case_sensitive` (bool) |
| `convert_type` | `column`, `to`: `string`\|`integer`\|`float`\|`boolean`\|`date`, `on_error`: `fail`\|`null` (default `fail`) |
| `split_column` | `column` (text), `separator` (non-empty), `into[≥2]` unique new names, `drop_original` (bool) |
| `merge_columns` | `columns[≥2]` unique, `separator` (string), `into` new name, `drop_sources` (bool) |
| `drop_duplicates` | `columns?` (omitted = all) |
| `drop_null_rows` | `columns?` (omitted = any) |
| `drop_columns` | `columns[≥1]`, at least one column remains |
| `rename_columns` | `mapping` {existing: non-empty new}, final names unique |

Validation rule shared by all: referenced columns exist in the schema produced by preceding
enabled steps; new names do not clash with remaining columns.

## StepDraft (frontend store)

- `drafts: Record<fileId, CleaningStep[]>`
- `form: { type, editingId | null } | null`
- `preview: CleaningPreview | null`, `previewStale: boolean`
- `validation: StepValidation[]`
- `applyJobId: string | null`

State transitions: any draft mutation → `previewStale = true` and revalidate. Apply completed →
draft cleared, preview reset. Apply failed/cancelled → draft kept, `applyJobId = null`.

## StepValidation

`{ index: int, operation_id?: string, valid: bool, message?: string }` — `index` is the position
in the submitted list (disabled steps are reported as valid and skipped).

## CleaningPreview

| Field | Type |
|-------|------|
| `columns_before`, `columns` | Column[] (schema before / after) |
| `before`, `after` | records (≤ limit rows each) |
| `removed_rows` | int[] — indices into `before` |
| `changed_cells` | `{row, column}[]` — `row` indexes `after`, `column` is the after name |
| `summary` | ChangeSummary |

## ChangeSummary (full dataset)

`{ rows_before, rows_after, rows_removed, values_changed, columns_added: string[],
columns_removed: string[], columns_renamed: {from, to}[] }`

## Column lineage (engine-internal)

`dict[current_name, original_name | None]`, updated per step: rename re-keys, drop/merge-drop/
split-drop remove keys, split/merge outputs map to `None`.
