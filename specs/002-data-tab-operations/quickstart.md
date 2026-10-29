# Data Tab Operations Quickstart Validation

This guide validates the feature across the Python engine, IPC boundary, and desktop UI. It
assumes the repository's current layout: `app/engine` and `app/desktop`.

See [data-model.md](data-model.md) for entities and [contracts/ipc.md](contracts/ipc.md) for
request and result shapes.

## Prerequisites

- Windows development environment with Python 3.11+, Node.js, Rust, and Tauri prerequisites.
- Dependencies installed for both `app/engine` and `app/desktop`.
- A writable temporary directory and a representative CSV or Parquet fixture containing text,
  numeric, date, null, category, and repeated-period columns.

## Setup

From the repository root:

```powershell
Set-Location app/engine
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -e ".[dev]"

Set-Location ..\desktop
npm install
```

## Backend and Contract Checks

From `app/engine`:

```powershell
py -m pytest tests/unit tests/contract tests/integration tests/performance
python -m ruff check .
python -m ruff format --check .
```

Expected outcomes:

- Typed filter rules validate safely and reject unknown columns, incompatible values, malformed
  rules, unsupported operators, and executable input.
- Sort preserves every row and applies ordered directions and consistent missing-value placement.
- Group by and pivot produce deterministic grouping keys, aggregate columns, and duplicate-cell
  handling; unpivot preserves identifiers and produces attribute/value rows.
- Failed or cancelled operations preserve the last valid working state.
- History tests prove per-dataset cursor movement, redo invalidation after a new operation, and
  clean save-cursor behavior after successful and failed saves.
- Save tests verify safe temporary writes, explicit overwrite confirmation, output validation,
  source-path behavior, and unchanged dirty state after failure.
- IPC contract tests verify request validation, job acknowledgements, completion payloads,
  boundary errors, bounded previews, and structured error codes.

## Frontend Checks

From `app/desktop`:

```powershell
npm test
npm run build
npm run format:check
```

Expected outcomes:

- Column selection supports search, multi-select, Select all, Clear all, confirmation, and
  rejection of an empty confirmed selection.
- Filter, sort, group by, pivot, and unpivot dialogs expose accessible labels, validation
  messages, loading states, and empty-result states.
- Save, Undo, and Redo buttons render only in the Data tab and reflect history availability.
- Ctrl+S, Ctrl+Z, and Ctrl+X invoke Save, Undo, and Redo from other tabs while text-editing
  fields retain native editing behavior.
- The close-request dialog offers Save, Discard changes, and Cancel and blocks closing until the
  selected action completes.
- Data-tab previews remain bounded and responsive at the supported desktop window sizes.

## End-to-End Scenario

1. Open the representative fixture and confirm the initial history is clean and Undo/Redo are
   unavailable.
2. From the Data tab, select several columns, search the list, confirm the order, and verify the
   preview projection; confirm this view-only action does not mark the dataset dirty.
3. Apply a text filter, a numeric filter, and a multi-key sort; verify row counts and ordering
   across page boundaries.
4. Apply Group by with count and a numeric aggregate, then verify grouping keys and named output
   columns.
5. Apply Pivot to repeated category/value intersections and verify the selected aggregation.
6. Apply Unpivot to wide period columns and verify identifier repetition and attribute/value
   fields.
7. Switch to Clean, Profile, or Export and press Ctrl+Z, Ctrl+X, and Ctrl+S; verify the same
   workspace history and save actions work while the buttons remain hidden.
8. Undo and redo from both a keyboard shortcut and the Data-tab buttons. Apply a new operation
   after Undo and verify the obsolete redo state is unavailable.
9. Trigger Save, confirm replacement when requested, and verify the saved file reopens with the
   current schema and records. Confirm the dirty state clears only after successful validation.
10. Make another change and attempt to close the desktop window. Verify Save, Discard changes,
    and Cancel each produce the specified result, including failed-save recovery.

## Acceptance Evidence

Record backend and frontend test output, fixture shape and size, save destination validation,
undo/redo history assertions, close-dialog screenshots or test evidence, keyboard accessibility
results, and responsive checks at the supported minimum and default window sizes.
