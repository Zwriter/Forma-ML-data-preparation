# Tasks: Sort as a Persistent View Mask

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/ipc.md](contracts/ipc.md)

**Tests**: Required (constitution III). Each task writes the failing test first.

## Phase 1: Foundational (engine)

- [x] T001 [P] Write failing tests in `app/engine/tests/unit/services/test_view_mask.py` for
  `validate_view` (unknown columns dropped and reported, bad direction/nulls rejected, duplicate
  columns rejected), `apply_view` (multi-key, nulls first/last, ties keep stored order, `[]`
  is a no-op), and `carry_view` (lineage rename follows, removal drops); then implement
  `app/engine/forma_engine/services/view_mask.py`.
- [x] T002 Write failing tests in `app/engine/tests/unit/services/test_history_service.py` for
  `WorkingStateEntry.view`: `open` with an initial view, `commit` with a view, undo/redo restore
  the previous view, saved index and dirty flag behave as for data changes; then extend
  `domain/entities.py` and `services/history_service.py`.

## Phase 2: User Story 1 - Sort the View Without Reordering the Data (P1)

- [x] T003 [US1] Failing tests, then make `sort_rows` in `data_operation_service.py` commit an
  entry with the same frame and the new keys (empty keys clear); allow empty `keys` in the sort
  validator; remove the sort transform from `operations.apply`.
- [x] T004 [US1] Failing tests, then apply the current view in `DatasetService.preview` before
  search, projection, and slicing; return `view` in the response.
- [x] T005 [US1] Failing tests in `test_cleaning_preview.py`, then page sorted source rows in
  `CleaningPreviewer` (row-id mapping unchanged) and return `view`; fill previous/next uses
  stored order.
- [x] T006 [US1] Failing tests, then carry the view through filter (unchanged keys), Clean apply
  (`carry_view` with lineage), and clear it for group by, pivot, unpivot.
- [x] T007 [US1] Contract tests in `tests/contract/` for `dataset.preview` and `cleaning.preview`
  `view`, and `data.apply` `sort_rows` with empty keys.
- [x] T008 [US1] Integration test in `tests/integration/test_sort_view_workflow.py`: sort → fill
  previous → apply → save copy writes stored order; export writes stored order.

## Phase 3: User Story 2 - Undo, Redo, and Save the Sort (P1)

- [x] T009 [US2] Failing tests, then skip the data write in `SaveService` when the current frame
  is the saved frame; mark saved and return `rewritten: false`.
- [x] T010 [US2] Vitest: a sort result updates the worksheet order and undo/redo restore it
  (existing job flow); fix any frontend assumption that sort changes data.

## Phase 4: User Story 3 - Reopen With the Saved Sort (P2)

- [x] T011 [P] [US3] Failing tests, then accept `view` in `dataset.open` (validate at the
  handler, drop missing columns) and return `view` and `dropped_columns`; contract test.
- [x] T012 [US3] Store tests, then add `app/desktop/src/stores/viewMaskStore.ts` (persisted
  `forma.sort-views`, read/write per path, storage failures ignored).
- [x] T013 [US3] Remember the view on save completion (written path, plus source path for copies)
  in `useWorkspaceHistory.ts`/`useWorkflowJobEvents.ts`; pass it to `dataset.open` on open;
  show one notice for `dropped_columns`. Integration test in
  `tests/integration/sort-view-workflow.test.tsx`.

## Phase 5: User Story 4 - See and Clear the Active Sort (P2)

- [x] T014 [US4] Tests, then show direction and priority in sorted column headers in
  `DatasetPreview.tsx` (text + icon, not colour alone).
- [x] T015 [US4] Tests, then start `SortBuilder.tsx` from the active keys and add Clear sort
  (applies `sort_rows` with `[]`).
- [x] T016 [US4] Playwright in `tests/ui/sort-view.pw.ts`: header indicators visible and readable
  at 800×600; give the demo runtime a stub view for `dataset.preview`.

## Phase 6: Polish

- [x] T017 Update `specs/002-data-tab-operations` notes that Sort is now a view (link to 004).
- [x] T018 Run quickstart checks; record the constitution review here.

### Constitution review (T018, 2026-11-05)

Checks run: pytest (335 passed), Ruff lint and format check (clean), Vitest (180 passed, exit 0,
no uncaught errors), Playwright `npm run test:ui` (9 passed), `tsc --noEmit` (clean), Prettier on
changed source files (clean), `check_source_limits.ps1` (passed). The manual walkthrough in
`quickstart.md` needs the desktop app with the engine and has not been run.

- **I/II SOLID, OOP**: `services/view_mask.py` is the one implementation of sort validation,
  ordering, and lineage carry; the transformation validator, `DatasetService`, `CleaningPreviewer`,
  `CleaningService`, and the `dataset.open` handler all call it. `HistoryService` owns the view per
  entry and the last saved path; `SaveService` decides whether a write is needed. The engine stays
  independent of React and Tauri.
- **III TDD**: every engine change started from a failing test (`test_view_mask.py`,
  `test_sort_view.py`, history, save, contract, and integration tests). Two older save tests
  relied on a "no data change" setup that is now skipped by design; they were changed to make a
  real data change so they keep testing confirmation and failure handling.
- **IV Frontend**: sort state in headers uses an arrow, a word, and priority (not colour alone),
  is part of the header's accessible name, and the primary key sets `aria-sort`. The dropped-column
  notice uses a polite `role="status"` info notification. Headers were checked at 800×600 in
  Playwright (confirmed failing with the indicator squeezed to 12 px). Demo mode reads its sort
  from `?demo-sort=` (`services/demoView.ts`) because it has no engine.
- **Architecture**: the frontend still receives only bounded pages plus the view; sorting runs in
  the engine. Remembered views live in the desktop's local storage (`forma.sort-views`), as decided.
- **V Size and duplication**: all files within 250 lines; the worksheet header moved to
  `explorer/ColumnHeading.tsx` to keep `DatasetPreview.tsx` under the limit.
- **VI/VII Formatting**: Ruff and Prettier clean on changed source files. Exception:
  `specs/002-data-tab-operations/spec.md` and `data-model.md` already failed Prettier before the
  T017 notes were added; they were left unformatted to avoid rewriting a finished spec.
- **Also fixed during this feature**: "Fill missing values → Most frequent value" counted missing
  cells as a value and could fill blanks with blanks (`cleaning_operations.py`, with tests).

## Dependencies

- T001 → T002 → Phase 2. T003 blocks T004–T008. T009 needs T002. T011 needs T001.
  T012 → T013. T014/T015 need T004. US1 + US2 form the MVP.
