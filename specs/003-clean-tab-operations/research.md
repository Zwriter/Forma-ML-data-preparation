# Research: Clean Tab Operations

## R1 — Row tracking for preview markers

- **Decision**: The previewer adds a hidden row-id column (`with_row_index`) to the full lazy
  frame, runs the steps through the existing executor, then takes the requested worksheet page
  of source row ids (after the same `search` filter as `dataset.preview`) and left-joins the
  result onto it. Ids with no result row are removed rows and keep their source values in place;
  changed cells compare values joined on row id through column lineage. *(Revised 2026-11-03:
  was "the first 100 source rows" for a separate Before/After view.)*
- **Rationale**: Running on the full frame keeps mean/median fill and duplicate detection correct
  for the sample rows (a sample-only run would compute statistics on 100 rows). Row ids survive
  every supported step because none reorders or aggregates.
- **Alternatives**: Diffing positional samples (breaks once a row is removed); running on the
  sample only (wrong statistics, misses duplicates of earlier rows outside the sample).
- **Consequence**: `drop_duplicates` without columns must compare only data columns, so the
  previewer injects the explicit column list before executing.

## R2 — Full-dataset change summary

- **Decision**: Rows before/after come from lazy `len()`; values changed is the sum over
  lineage-matched columns of `ne_missing` on string-cast values in an inner join on row id.
  Column changes come from lineage: added (no origin), removed (origin gone), renamed (origin
  name differs).
- **Rationale**: One lazy query, no data in the UI, string cast makes convert-type comparisons
  well-defined (`"1"` vs `1` counts as unchanged).
- **Alternatives**: Counting only within the sample (fails FR-008).

## R3 — Convert-type error policy

- **Decision**: `convert_type` gains `on_error: "fail" | "null"` (default `"fail"`, preserving
  today's strict behavior). On `"fail"` a precondition counts values that are non-null before and
  null after a non-strict cast and raises `"N values in 'col' cannot be converted to <type>."`.
  On `"null"` the cast is non-strict.
- **Rationale**: Today's strict cast surfaces only a generic error; the count is actionable.

## R4 — New operation semantics

- **replace_values** `{columns, find, replace|null, match: "whole"|"contains", case_sensitive}`:
  whole-cell compares the string form; `contains` uses literal `str.replace_all(literal=True)`
  on text columns only. Case-insensitive literal replacement escapes the needle and uses a
  `(?i)` regex built from `re.escape` — still data, never user code.
- **split_column** `{column, separator, into: [names], drop_original}`: `str.split_exact` into
  `len(into)-1` splits then rejoins any remainder into the last part via `splitn(len(into))`.
  Missing parts become null.
- **merge_columns** `{columns, separator, into, drop_sources}`: `concat_str` over string-cast
  columns with nulls filled as `""`.
- **fill_null** strategies add `"previous"` (`forward_fill`) and `"next"` (`backward_fill`).
- **Remove** maps to existing `drop_duplicates`, `drop_null_rows`, `drop_columns`.

## R5 — Per-step validation

- **Decision**: New `cleaning.validate` walks enabled steps, validating each against the schema
  produced by preceding valid steps (`collect_schema` on the lazy plan — no data read). An
  invalid step is reported and skipped so later steps are still checked.
- **Rationale**: FR-006 needs the failing step identified; schema-only validation is cheap
  enough to run after every edit.

## R6 — Frontend state and ribbon wiring

- **Decision**: A Zustand `cleaningStore` holds `drafts` keyed by open-file id, the open form
  (`{type, editingId}`), panel state, live preview and its status, validation, and running job
  id. Clean ribbon
  commands call `openForm` on the store; `WorkspaceChrome` needs one branch, `App.tsx` none.
- **Rationale**: `App.tsx` and `WorkspaceChrome.tsx` are near the 250-line limit; a store keeps
  the Clean tab self-contained and testable.

## R7 — Apply lifecycle

- **Decision**: Reuse `cleaning.apply` (already one history entry, cancellable job). On
  `engine-event` completion of kind `clean`, the draft for the active file is cleared; on
  failure or cancel the draft is kept. While running, the footer shows Stop (`job.cancel`).

## R9 — Live worksheet preview (revision 2026-11-03)

- **Decision**: A `useLivePreview` hook calls `cleaning.preview` for the page on screen whenever
  the enabled draft, the page, the visible columns, or the search change, debounced ~250 ms. Each
  request carries a sequence number; a response is applied only if it is the latest, so rapid
  edits never show results out of order. With no enabled steps the worksheet shows the plain
  `dataset.preview` page.
- **Rationale**: The spec drops the Preview button; the worksheet must always match the draft.
  Bounded pages keep FR-018; the full-dataset summary still comes from the engine.
- **Alternatives**: Recomputing on every keystroke without debounce (floods IPC); a manual
  refresh button (rejected by the spec).

## R10 — Shared worksheet view state

- **Decision**: Lift `search`, `activeCell`, and scroll offsets from `DatasetPreview` local state
  into `datasetStore` next to the existing `selectedColumns` and page, saved per `OpenFileTab`.
  The Clean tab renders the same `DatasetPreview` with an optional read-only `markers` input
  (changed cells, removed rows, added/renamed column flags) built from `CleaningPreview`.
- **Rationale**: One worksheet component and one state source satisfy "same worksheet, same
  state" without duplicating the grid.
- **Alternatives**: A separate Clean grid (duplicates the worksheet, violates Principle V);
  copying state on tab switch (drifts when either tab changes it).

## R11 — Floating steps panel

- **Decision**: `StepsPanel` is absolutely positioned over the right side of the worksheet
  stage (≈ 22 rem wide), opens when a step is added, collapses to a vertical edge tab labelled
  with the step count, and hides when the draft is empty. Below 960 px it overlays the full
  stage height and starts collapsed after Apply or Cancel. The worksheet keeps its own scroll so
  columns under the panel stay reachable.
- **Rationale**: Matches the requested hover panel while keeping the worksheet full width.

## R8 — Demo runtime

- **Decision**: Browser demo mode (`demoData.ts`) does not implement cleaning methods; the Clean
  tab shows the IPC error as for other unsupported demo methods. Out of scope for this feature.
