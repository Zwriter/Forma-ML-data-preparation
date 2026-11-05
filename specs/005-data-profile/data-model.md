# Data Model: Data Profile Dashboard

Engine shapes are what the profile job returns (see [contracts/ipc.md](contracts/ipc.md)).
Desktop shapes mirror them in `app/desktop/src/types/profile.ts`.

## WorkingStateEntry (engine, extended)

- Existing: `dataset`, `frame`, `operation`, `view`
- **New** `data_version: str` (UUID)

| Change | `data_version` of the new entry |
|--------|---------------------------------|
| Open file | new |
| Commit with a new frame (Clean apply, filter, reshape, drop) | new |
| Commit reusing the current frame object (`sort_rows`) | inherited from the current entry |
| Undo / redo | the target entry's own version (no change to entries) |

`ChangeHistory.to_dict()` adds `data_version` (of the current entry).

## DetectedType

`"integer" | "decimal" | "datetime" | "boolean" | "text" | "other"`

- Non-text stored types map directly: integer dtypes → `integer`, float/decimal dtypes →
  `decimal`, date/datetime/time → `datetime`, boolean → `boolean`, anything else (lists,
  structs, binary) → `other`.
- Text columns: first candidate in order integer → decimal → datetime → boolean whose parsed
  share of non-null values is ≥ 0.95, else `text` (research R2). An all-null text column is `text`.

## Profile

| Field | Type | Rules |
|-------|------|-------|
| `dataset_id` | string | Dataset profiled |
| `history_id` | string | History the profile belongs to |
| `data_version` | string | `data_version` of the entry profiled |
| `computed_at` | string | ISO 8601 UTC time the job finished |
| `row_count` | int | ≥ 0 |
| `column_count` | int | ≥ 0 |
| `missing_cells` | int | Sum of column `missing_count` |
| `duplicate_rows` | int | `row_count − distinct rows`; 0 when no columns |
| `quality` | QualityBreakdown | |
| `columns` | ColumnProfile[] | In schema order; length = `column_count` |

## QualityBreakdown

| Field | Type | Rules |
|-------|------|-------|
| `total_cells` | int | `row_count × column_count` |
| `valid_cells` | int | `total − missing − invalid` |
| `missing_cells` | int | |
| `invalid_cells` | int | Sum of column `invalid_count` |
| `completeness` | float \| null | `valid / total`; `null` when `total_cells = 0` (shown as "—") |

Invariant: `valid_cells + missing_cells + invalid_cells = total_cells`.

## ColumnProfile

| Field | Type | Rules |
|-------|------|-------|
| `position` | int | 1-based schema position |
| `name` | string | |
| `stored_type` | string | Engine dtype name |
| `detected_type` | DetectedType | |
| `missing_count` | int | Null cells |
| `invalid_count` | int | Non-null cells failing `detected_type`; 0 for non-text stored types |
| `unique_count` | int | Distinct values, nulls excluded |
| `completeness` | float \| null | `(rows − missing − invalid) / rows`; `null` when 0 rows |
| `quality` | `"good" \| "needs_attention" \| "poor"` | FR-011 ordered rule; a dataset with 0 rows gives `"good"` |
| `examples` | string[] | ≤ 3 distinct non-null values as text, from the first 10,000 rows |
| `numeric` | NumericSummary \| null | Present for `integer`, `decimal`, `datetime` with ≥ 1 value |
| `categories` | CategorySummary \| null | Present for `text`, `boolean` with ≥ 1 value |

Quality rule (`invalid_share = invalid_count / rows`):
1. `poor` if `completeness < 0.90` or `invalid_share > 0.01`
2. else `needs_attention` if `completeness < 0.99` or `invalid_count > 0`
3. else `good`

## NumericSummary

| Field | Type | Rules |
|-------|------|-------|
| `mean`, `median`, `std`, `min`, `max` | number \| string | Numbers for numeric columns; ISO strings for `datetime` (`std` as seconds, number). `std` is 0 for one value |
| `histogram` | HistogramBin[] | 1–50 bins (default ≤ 30); counts sum to non-null valid values |

Text columns detected as numeric or datetime are summarised on their parsed values. Invalid
cells are excluded.

## HistogramBin

| Field | Type | Rules |
|-------|------|-------|
| `start` | number \| string | Inclusive lower edge (ISO string for datetime) |
| `end` | number \| string | Exclusive upper edge; last bin is inclusive |
| `count` | int | ≥ 0 |

## CategorySummary

| Field | Type | Rules |
|-------|------|-------|
| `top` | `{ value: string, count: int }[]` | ≤ 10, by count descending, then value ascending |
| `other_count` | int | Non-null values not in `top` |
| `distinct_count` | int | Same as column `unique_count` |

## Profile run state (desktop, `profileStore`)

Keyed by `history_id`.

| Field | Type |
|-------|------|
| `profile` | Profile \| null — last finished profile |
| `status` | `idle \| running \| ready \| failed` |
| `jobId` | string \| null |
| `progress` | number 0–1 \| null |
| `error` | `{ code, message }` \| null |
| `distributionColumn`, `categoryColumn` | string \| null — chart picks for this session |

Derived: `isStale = profile && (profile.data_version !== history.data_version)`.

```text
idle ──open tab / Refresh──▶ running ──completed──▶ ready
                              │  │                    │
                              │  └─failed──▶ failed   └─data changes─▶ ready (stale)
                              └─cancelled──▶ ready (previous profile, stale) or idle (none)
failed / stale ready ──Refresh / Try again──▶ running
```

## ProfileTablePreferences (desktop)

- `hiddenColumns: ("type" | "completeness" | "unique" | "quality" | "missing" | "examples")[]`
- Persisted in `localStorage` under `forma.profile-columns`. Unknown values are dropped on read.
  Unreadable storage → nothing hidden.
- Table filter, search, and sort state are not persisted.

## RejectExportRequest / Result

| Field | Type | Rules |
|-------|------|-------|
| `dataset_id` | string | Must exist |
| `data_version` | string | Must equal the current entry's version, else `PROFILE_STALE` |
| `column` | string \| null | `null` = all columns; else must exist in the schema |
| `destination` | string | Non-empty, ≠ dataset source path (`FILE_ACCESS_ERROR`) |
| `format` | `csv \| parquet` | |
| `force_overwrite` | bool | Default false |

Result: the `write_safe` result (`destination`, `format`, `row_count`, `schema`,
`replaced_existing`, `validated`) plus `reason_column: string`.

**Reject reason**: for each in-scope column with an invalid cell in the row, in schema order,
`{column}: "{value}" is not {type phrase}`, joined with `"; "`. `value` is cut to 60 characters,
ending with `…`. Type phrases: integer → "an integer", decimal → "a decimal number",
datetime → "a date/time", boolean → "a boolean".

## ProfileReportRequest / Result

| Field | Type | Rules |
|-------|------|-------|
| `dataset_id`, `data_version` | string | As above; the engine's last profile for this history must have this `data_version`, else `PROFILE_STALE` |
| `distribution_column`, `category_column` | string \| null | Charts to feature; must be columns with the matching summary |
| `destination` | string | Non-empty, `.html` |
| `force_overwrite` | bool | Default false |

Result: `{ destination, bytes, replaced_existing }`.
