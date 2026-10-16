# Implementation Plan: Data Tab Operations

**Branch**: `002-data-tab-operations` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-data-tab-operations/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Implement workspace-wide Save, Undo, and Redo with Data-tab-only buttons and global keyboard
shortcuts, then add bounded-preview data operations for multi-column selection, filtering,
sorting, grouping, pivoting, and unpivoting. Extend the existing declarative transformation and
job pipeline instead of creating parallel execution paths. Keep complete working states and the
saved-history cursor in the Python engine; keep only status, metadata, and bounded previews in
the frontend. Use the existing safe writer for Save and the Tauri close-request boundary for the
unsaved-changes dialog.

## Technical Context

**Language/Version**: Python 3.11+, TypeScript/TSX with React 18, Rust for the existing Tauri 2 bridge

**Primary Dependencies**: Polars, DuckDB-compatible existing engine dependencies, Zustand, Vite,
Vitest, Testing Library, Tauri 2

**Storage**: Local CSV/Parquet files; in-session lazy working frames and history; safe temporary
file replacement for Save

**Testing**: pytest unit/contract/integration/performance tests; Ruff check and format checks;
Vitest, TypeScript build, Prettier, and desktop integration/e2e tests

**Target Platform**: Windows desktop through the existing Tauri application

**Project Type**: Local-first desktop application with a React frontend and independent Python
processing engine

**Performance Goals**: Show an operation state within 1 second; keep the interface interactive
while full-dataset work runs; restore history state within 1 second after a command completes;
keep frontend payloads bounded to previews, metadata, and aggregates

**Constraints**: Process locally; preserve the source until explicit Save; validate all IPC
inputs; never execute user-provided filter code; use safe temporary writes; retain production
files at or below 250 formatted lines; do not transfer complete large datasets to the UI

**Scale/Scope**: One active local dataset per workspace, including representative 1-5 GB files;
one history per loaded dataset; five new data operation types plus Save/Undo/Redo and close
protection; no collaboration, cloud, database query, or custom expression support

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **PASS**: Backend behavior remains in the independent Python engine and follows cohesive
  service/domain responsibilities; the frontend depends on IPC abstractions only.
- **PASS**: New backend transformations, validators, save behavior, and IPC contracts will use
  focused failing tests before implementation and will add integration coverage at the boundary.
- **PASS**: The frontend plan includes accessible dialogs, keyboard shortcuts, visible states,
  close protection, and responsive checks at supported window sizes.
- **PASS**: The plan reuses the existing job manager, transformation executor, and safe writer;
  new modules are split by responsibility to preserve the 250-line source limit.
- **PASS**: Python changes will use Ruff and PEP 8; TypeScript, TSX, CSS, and JSON changes will
  use the configured Prettier checks.
- **PASS**: No HTTP-capable integration is added, so the constitution's CORS requirement does
  not create a new change surface.

**Post-design re-evaluation**: PASS. The design keeps complete data and transformation state in
the independent engine, limits frontend responses to bounded previews and metadata, assigns
backend behavior to cohesive services with TDD/contract coverage, and keeps the desktop UI
accessible and responsive. No constitution violation or complexity exception remains.

## Project Structure

### Documentation (this feature)

```text
specs/002-data-tab-operations/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
```text
app/
├── desktop/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── explorer/
│   │   │   ├── data-operations/       # new operation dialogs and builders
│   │   │   └── workspace/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── types/
│   │   └── styles/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
└── engine/
  ├── forma_engine/
  │   ├── domain/
  │   ├── io/
  │   ├── ipc/
  │   ├── jobs/
  │   ├── services/
  │   └── transformations/
  └── tests/
    ├── unit/
    ├── contract/
    ├── integration/
    └── performance/
```

**Structure Decision**: Use the existing two-layer desktop structure. Add typed data-operation
builders and workspace history coordination under `app/desktop/src`, extend the existing engine
domain/services/transformations/IPC modules under `app/engine`, and add focused tests beside the
existing unit, contract, integration, performance, and e2e suites. Keep the Tauri Rust bridge
unchanged except where close-request event wiring requires a minimal platform-boundary change.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | The feature fits the existing frontend, engine, IPC, and Tauri boundaries. |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
