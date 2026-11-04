# Data Model: Sort as a Persistent View Mask

## SortKey

| Field | Type | Rules |
|-------|------|-------|
| `column` | string | Exists in the entry's schema |
| `direction` | `ascending` \| `descending` | Required |
| `nulls` | `first` \| `last` | Required |

Same shape as the 002 `sort_rows` key. A view is an ordered list of unique-column keys; `[]`
means stored order.

## WorkingStateEntry (engine, extended)

- `dataset`, `frame`, `operation` (unchanged)
- `view: list[SortKey]` — display order for this entry

Transitions:

| Change | New entry frame | New entry view |
|--------|-----------------|----------------|
| `sort_rows` | same frame object | the given keys (may be `[]` = clear) |
| `filter_rows`, Clean apply | transformed frame | previous view mapped through lineage |
| `group_by`, `pivot`, `unpivot` | transformed frame | `[]` |
| open with remembered view | source frame | validated keys (initial, saved state) |

## RememberedViews (desktop)

- `views: Record<path, SortKey[]>` persisted under `forma.sort-views`.
- Written on save completion for the written path; also for the source path on copy saves.
- Read when opening a file and sent as `view` to `dataset.open`.
