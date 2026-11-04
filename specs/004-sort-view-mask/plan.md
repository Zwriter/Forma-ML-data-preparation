# Implementation Plan: Sort as a Persistent View Mask

**Branch**: `004-sort-view-mask` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-sort-view-mask/spec.md`

## Summary

Sorting stops reordering data. Each undo history entry gains a `view` (ordered sort keys) next
to its frame. `sort_rows` commits a new entry that reuses the current frame with new keys, so
undo, redo, and the unsaved marker work as before. Every place that shows rows (`dataset.preview`,
`cleaning.preview`) applies the entry's view through one shared helper; everything that writes
or transforms data (Clean apply, data operations, save, export) uses the stored frame and order.
Other changes carry the view forward, mapped through column lineage. Save skips the data write
when only the view changed. The desktop app remembers the saved view per file path in its
settings storage (Forma's app data folder) and passes it to `dataset.open`.

## Technical Context

**Language/Version**: Python 3.11+ (venv 3.14), TypeScript/TSX with React 18, Rust (Tauri 2,
unchanged)

**Primary Dependencies**: Polars, Zustand, Vite, Vitest, Testing Library, Playwright, Tauri 2

**Storage**: View per history entry in the engine; remembered views per file path in the
desktop settings storage (WebView storage inside the app data folder)

**Testing**: pytest unit/contract/integration, Ruff; Vitest unit/integration, Playwright UI,
`tsc --noEmit`, Prettier

**Target Platform**: Windows desktop through the existing Tauri application

**Project Type**: Local-first desktop app with React frontend and independent Python engine

**Performance Goals**: Sorted page within 1 s on 1 M rows (lazy sort + slice); sort change
needs no data copy

**Constraints**: Stored row order never changes for a sort; bounded preview pages only;
production files ≤ 250 formatted code lines; IPC inputs validated

**Scale/Scope**: 1 changed operation (`sort_rows`), 4 IPC methods extended (`dataset.open`,
`dataset.preview`, `cleaning.preview` response, `dataset.save` result), 1 new engine helper
module, 1 new frontend store

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I/II SOLID & OOP — PASS**: View handling lives in one `view_mask` module (validate, apply,
  carry through lineage); `HistoryService` owns entries; services stay single-purpose. The
  engine stays independent of React/Tauri.
- **III TDD — PASS**: Failing pytest first for view validation, sorted paging, history commits,
  lineage carry, save skip, and every IPC shape; Vitest for the store and UI; Playwright for
  header indicators.
- **IV Frontend UX — PASS**: Sorted headers show direction and priority in text; Sort dialog
  starts from active keys with Clear sort; dropped keys are reported once.
- **V Size & duplication — PASS**: One sort helper shared by both previews (removes the sort
  branch from `operations.apply`); `dataset_service.py` and `cleaning_preview.py` get calls, not
  copies.
- **VI/VII Formatting — PASS**: Ruff and Prettier on touched files.
- **Architecture — PASS**: No HTTP surface; data stays in the engine; nothing written beside
  user files.

**Post-design re-evaluation**: PASS. Writes and transforms never see the view, so the stored
order cannot drift; reads apply it in one place.

## Project Structure

### Documentation (this feature)

```text
specs/004-sort-view-mask/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ipc.md
└── tasks.md
```

### Source Code (repository root)

```text
app/engine/forma_engine/
├── domain/entities.py                 # WorkingStateEntry.view
├── services/view_mask.py              # NEW: validate, apply (stable sort), carry via lineage
├── services/history_service.py        # open/commit/commit_view keep or set the view
├── services/dataset_service.py        # open(view), preview applies view, register_derived carries
├── services/data_operation_service.py # sort_rows commits a view entry; reshapes clear it
├── services/cleaning_service.py       # apply carries view through lineage
├── services/cleaning_preview.py       # pages sorted source rows
├── services/save_service.py           # skip write when only the view changed
└── ipc/*_handlers.py                  # validate view params, return view

app/desktop/src/
├── stores/viewMaskStore.ts            # NEW: remembered views per file path (persisted)
├── features/data-operations/SortBuilder.tsx   # start from active keys, Clear sort
├── features/explorer/DatasetPreview.tsx       # header direction/priority
├── features/workspace/useWorkspaceHistory.ts  # remember view on save
└── services/fileOpen (existing open flow)     # pass remembered view to dataset.open
```

**Structure Decision**: Extend the existing engine services and desktop stores; one new module
on each side.

## Complexity Tracking

No constitution violations.
