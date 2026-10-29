# Implementation Plan: Clean Tab Operations

**Branch**: `003-clean-tab-operations` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-clean-tab-operations/spec.md`

## Summary

Replace the JSON-based Clean tab with a guided step workflow: an ordered draft of typed cleaning
steps (add, edit, toggle, reorder, duplicate, delete), a bounded before/after preview with cell
and row markers plus a full-dataset change summary, and a single Apply that runs as a
cancellable background job and lands as one entry in the existing 002 change history. The engine
gains three operations (replace values, split column, merge columns), two fill strategies
(previous/next value), and a convert-type error policy, plus per-step validation and a
row-tracking previewer. The existing executor, job manager, history service, and `cleaning.apply`
route are reused unchanged in behavior.

## Technical Context

**Language/Version**: Python 3.11+ (venv runs 3.14), TypeScript/TSX with React 18, Rust (Tauri 2,
unchanged)

**Primary Dependencies**: Polars, Zustand, Vite, Vitest, Testing Library, Tauri 2

**Storage**: In-session lazy frames and history in the engine; draft steps in a frontend store
keyed by open file

**Testing**: pytest unit/contract/integration; Ruff check + format; Vitest unit/integration/e2e,
`tsc --noEmit`, Prettier

**Target Platform**: Windows desktop through the existing Tauri application

**Project Type**: Local-first desktop app with React frontend and independent Python engine

**Performance Goals**: Preview of up to 10 steps within 3 s on a representative dataset; apply
shows running state within 1 s; preview payload bounded to 100 rows

**Constraints**: No user code execution; source file untouched; production files ≤ 250 formatted
code lines (`app/scripts/check_source_limits.ps1`); only bounded rows cross IPC

**Scale/Scope**: 9 step types, 3 IPC methods (1 new, 1 extended, 1 reused), one new frontend
feature folder replacing `TransformationBuilder`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I/II SOLID & OOP — PASS**: New cleaning operations live in a focused
  `cleaning_operations` module dispatched from `operations.apply`; preview row tracking is a
  `CleaningPreviewer` class with one responsibility; step validation is a `StepValidator`.
  The engine stays independent of React/Tauri.
- **III TDD — PASS**: Every new operation, validation rule, preview marker, summary count, and
  IPC shape gets a failing pytest first; frontend store and components get Vitest coverage.
- **IV Frontend UX — PASS**: Guided forms, keyboard-operable step menus and switches,
  `aria-live` preview status, visible running/failed states, stacked layout under 960 px.
- **V Size & duplication — PASS**: `operations.py` (108 lines) and `validators.py` (178) are not
  extended in place; new code goes to new modules. `App.tsx` and `WorkspaceChrome.tsx` (near the
  limit) get only wiring lines; Clean-tab state lives in a dedicated store.
- **VI/VII PEP 8 & formatting — PASS**: Ruff and Prettier run on all touched files.
- **Architecture — PASS**: No HTTP surface added (CORS unaffected); IPC inputs validated in
  handlers; full data stays in the engine.

**Post-design re-evaluation**: PASS. The design adds no parallel execution path: preview and
apply both use `executor.execute`; history entry creation stays in `CleaningService.apply`.

## Project Structure

### Documentation (this feature)

```text
specs/003-clean-tab-operations/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ipc.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── engine/
│   ├── forma_engine/
│   │   ├── transformations/
│   │   │   ├── cleaning_operations.py     # new: replace, split, merge, fill ffill/bfill, convert policy
│   │   │   ├── cleaning_validators.py     # new: parameter rules + frame preconditions
│   │   │   ├── lineage.py                 # new: column lineage across steps
│   │   │   ├── operations.py              # dispatch new types
│   │   │   ├── validators.py              # delegate new types
│   │   │   └── executor.py                # delegate preconditions
│   │   ├── services/
│   │   │   ├── cleaning_preview.py        # new: CleaningPreviewer (markers + summary)
│   │   │   ├── step_validator.py          # new: per-step validation
│   │   │   └── cleaning_service.py        # multi-step preview, validate_steps
│   │   └── ipc/
│   │       ├── cleaning_handlers.py       # cleaning.validate, operations[] preview
│   │       └── router.py
│   └── tests/{unit,contract,integration}/
└── desktop/
    ├── src/
    │   ├── features/cleaning/             # CleanTab, StepList, StepCard, StepMenu, AddStepMenu,
    │   │                                  # StepFormDialog, forms/*, PreviewPanel, PreviewTable,
    │   │                                  # stepCatalog, useCleaningJob
    │   ├── stores/cleaningStore.ts        # replaces transformationStore
    │   ├── types/cleaning.ts
    │   └── styles/cleaning*.css
    └── tests/{unit/cleaning,integration,e2e}/
```

**Structure Decision**: Keep the two-layer structure. Remove the JSON `TransformationBuilder`,
`TransformationValidation`, `BeforeAfterComparison`, and `transformationStore`, replacing them
with the guided Clean tab. Clean ribbon commands open step forms through `cleaningStore` so
`App.tsx` gains no new props.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | The feature fits the existing engine, IPC, and workspace boundaries. |
