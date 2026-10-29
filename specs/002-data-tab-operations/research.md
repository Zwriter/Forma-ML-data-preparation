# Data Tab Operations Research

## Decision 1: Extend the existing declarative transformation pipeline

- **Decision**: Represent filter, sort, group by, pivot, and unpivot as validated transformation
  types and execute them through the existing transformation validator, executor, dataset
  service, and job manager.
- **Rationale**: Cleaning already has one validation and execution boundary. Reusing it keeps
  operation ordering, failure behavior, cancellation, and IPC error handling consistent while
  allowing the Data tab to submit user-friendly typed specifications rather than code.
- **Alternatives considered**: Implement each Data-tab operation as an unrelated IPC endpoint
  and service. Rejected because it would duplicate validation, job handling, and derived-result
  lifecycle logic.

## Decision 2: Keep complete change history in the processing layer

- **Decision**: Add a per-open-dataset working history owned by `DatasetService`. Each successful
  transformation produces a derived dataset/frame and advances a history cursor; undo and redo
  move the cursor and return bounded metadata for the selected state. The frontend mirrors only
  history availability, save status, and the current preview.
- **Rationale**: Full-file states can be much larger than the UI can safely hold. The engine
  already retains lazy frames for active datasets, so the backend is the correct owner of
  reversible data state. A single active workspace matches the current desktop behavior.
- **Alternatives considered**: Store complete row snapshots or operation results in Zustand.
  Rejected because it violates bounded frontend transfer and creates memory pressure for large
  datasets.

## Decision 3: Use an explicit saved-history cursor for dirty state

- **Decision**: Track the current history position and the last successfully saved history
  position in the backend working state. The frontend receives `is_dirty`, `can_undo`, and
  `can_redo` as workspace metadata. A successful save advances the saved cursor to the current
  position without clearing undo history.
- **Rationale**: Comparing complete datasets is expensive and unreliable for lazy frames. Cursor
  positions make save, undo, redo, and the close guard deterministic.
- **Alternatives considered**: Compare schema and previews or hash all records after every action.
  Rejected because previews are incomplete and full hashing adds unnecessary work to each edit.

## Decision 4: Use safe replacement for Save

- **Decision**: Save the current working frame to the original dataset path and format through
  the existing `write_safe` temporary-file, validation, and atomic-replace behavior. The UI must
  request explicit confirmation before passing overwrite approval.
- **Rationale**: This preserves the existing source-safety contract while implementing the
  requested Save action. Failed writes leave the last valid saved file and dirty state intact.
- **Alternatives considered**: Write directly to the source path or make Save an export-only
  action. Rejected because direct writes can leave partial files and export-only behavior would
  not satisfy the requested Save semantics.

## Decision 5: Use typed, non-code criteria for filtering

- **Decision**: The frontend sends filter rules containing a column, operator, value, and value
  type plus an all/any combination mode. The backend validates columns and values, then compiles
  the constrained rules into Polars expressions. Supported operators are equality, inequality,
  contains, begins with, ends with, numeric/date comparisons, and empty/not-empty checks.
- **Rationale**: This matches the non-technical UX requirement and keeps filter input separate
  from executable code. It also gives the backend one authoritative validation path.
- **Alternatives considered**: Send arbitrary SQL or Python-like expressions. Rejected because
  they increase security and ambiguity risk and conflict with the existing safe-filter contract.

## Decision 6: Use ordered specifications for sort and reshape operations

- **Decision**: Sort uses an ordered list of column/direction keys. Group by uses grouping
  columns plus named aggregate requests. Pivot uses row labels, one category column, one value
  column, and one supported aggregation. Unpivot uses identifier columns and value columns.
- **Rationale**: Explicit ordered specifications are serializable, testable, explainable in the
  UI, and map directly to deterministic Polars operations.
- **Alternatives considered**: Infer operation roles from selected columns or accept free-form
  query text. Rejected because inference is surprising and query text is unsuitable for the
  target audience.

## Decision 7: Keep long-running operations asynchronous

- **Decision**: Submit save and dataset-changing operations through the existing job manager;
  return job identifiers immediately and publish progress, completion, failure, or cancellation
  events. Undo and redo use the same state transition boundary and return the selected dataset
  state when complete.
- **Rationale**: The existing job manager already provides responsive UI behavior and structured
  terminal states. The feature's large-file and responsiveness criteria require the same model.
- **Alternatives considered**: Block the IPC request until the whole file operation completes.
  Rejected because it would make the desktop UI appear frozen and would duplicate job-state code.

## Decision 8: Dispatch global shortcuts in the workspace shell

- **Decision**: Register one document-level keyboard handler in the workspace shell. Outside
  text-editing fields, Ctrl+S invokes Save, Ctrl+Z invokes Undo, and Ctrl+X invokes Redo. The
  Data-tab ribbon renders the visible buttons; other tabs do not render those buttons but retain
  shortcut behavior.
- **Rationale**: One handler gives all tabs identical behavior and prevents shortcut logic from
  being duplicated across feature panels. Excluding editable fields preserves native text input
  behavior, including cut with Ctrl+X.
- **Alternatives considered**: Register shortcuts separately in each tab or use browser defaults.
  Rejected because tab-local handlers would drift and browser defaults do not provide the
  requested Ctrl+X redo mapping.

## Decision 9: Use a close-request guard at the desktop window boundary

- **Decision**: Subscribe to the Tauri window close-request event. If the workspace is dirty,
  prevent closing and show a Save/Discard/Cancel dialog; allow close only after Save succeeds or
  Discard is explicitly selected.
- **Rationale**: The close guard must cover the title-bar close control and operating-system
  window-close requests, not just one React button.
- **Alternatives considered**: Intercept only the custom close button or use browser
  `beforeunload`. Rejected because either approach can miss native desktop close requests.

## Resolved Technical Baseline

- Frontend: React 18, TypeScript, Zustand, Vite, Vitest, Testing Library.
- Engine: Python 3.11+, Polars, DuckDB-compatible existing project dependencies, pytest, Ruff.
- Desktop bridge: Tauri 2 and the existing newline-delimited JSON sidecar request/event protocol.
- Platform: Windows desktop with the current Tauri window constraints.
- Existing source files and tests remain under `app/`; no HTTP integration is introduced, so no
  additional CORS surface is required.
