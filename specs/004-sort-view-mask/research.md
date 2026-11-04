# Research: Sort as a Persistent View Mask

## R1 — Where the mask lives

- **Decision**: `WorkingStateEntry.view: list[SortKey]`, default `[]`. `sort_rows` commits a new
  entry with the current frame (same object, no copy) and the new keys.
- **Rationale**: Undo, redo, trimming, and the unsaved marker already work per entry, so a sort
  is undoable and dirty with no new history code.
- **Alternatives**: A frontend-only view (cannot join the engine's undo stack); keeping
  `sort_rows` as a transform (breaks fill previous/next and saved order).

## R2 — Applying the view

- **Decision**: `view_mask.apply(frame, keys)` sorts lazily with `maintain_order=True` and
  per-key `nulls_last`; `dataset.preview` applies it before search and slicing.
  `CleaningPreviewer` sorts the row-id-tagged source frame before paging, then maps results by
  row id as it does today.
- **Rationale**: One helper; ties keep stored order; paging stays bounded.
- **Alternatives**: Sorting each page (wrong across pages).

## R3 — Carrying the view through changes

- **Decision**: Filter and other non-reshaping data operations keep the keys. Clean apply maps
  keys through `lineage.py` (rename follows, removal drops). Group by, Pivot, Unpivot clear them.
- **Rationale**: Matches FR-004, FR-005, FR-014 with existing lineage code.

## R4 — Save when only the view changed

- **Decision**: If the current entry's frame is the saved entry's frame (identity), skip the
  write, mark saved, and return `rewritten: false`.
- **Rationale**: FR-009; avoids pointless copies now that save-as-copy is the default.

## R5 — Remembering the view

- **Decision**: The desktop app stores `{ [path]: SortKey[] }` in its settings storage
  (`forma.sort-views`), written when a save completes for the written path and, for copies, the
  source path. `dataset.open` takes an optional `view`; the engine drops keys for missing
  columns and returns the applied `view` and `dropped_columns`.
- **Rationale**: Same storage as existing settings, which lives in the app data folder in the
  desktop app; the engine stays free of app paths.
- **Alternatives**: Engine-side JSON in an app data path passed by Tauri (more plumbing for the
  same result).

## R6 — Showing the active sort

- **Decision**: `dataset.preview` and `cleaning.preview` responses include `view`; the worksheet
  header and the Sort dialog read it from the current page.
- **Rationale**: No extra request; always matches what is shown.
