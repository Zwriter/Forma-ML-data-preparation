# Implementation Plan: Forma MVP Data Preparation Workflow

**Branch**: `001-forma-mvp` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-forma-mvp/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Deliver the local-first import, inspect, profile, clean, preview, and export workflow for CSV
and Parquet datasets. The Python engine owns dataset access, profiling, transformations, job
state, and safe exports. The React/Tauri desktop layer presents bounded results and forwards
validated newline-delimited JSON commands and events.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Python 3.11; TypeScript 5.x; Rust stable; React 18+

**Primary Dependencies**: Polars, DuckDB, pytest, React, Vite, Tauri 2, TanStack Table,
Apache ECharts, Zustand, and Tailwind CSS/shadcn/ui as documented by the project stack

**Storage**: Source and output CSV/Parquet files; temporary files for safe exports; SQLite
metadata is reserved for later workflow persistence and is not required for the MVP happy path

**Testing**: pytest unit/integration/contract tests for the engine; Vitest and Testing Library
for frontend behavior; Tauri or Playwright end-to-end coverage for the primary workflow

**Target Platform**: Windows desktop first, with platform-neutral boundaries for future macOS
and Linux packaging

**Project Type**: Local-first desktop application with an independent reusable Python engine

**Performance Goals**: Open and preview a 1 GB or larger supported dataset without full
frontend materialization; show operation state within 1 second; keep the desktop interface
interactive during background processing

**Constraints**: Local-only processing; bounded preview and aggregate responses; source files
preserved by default; safe atomic export behavior; cooperative cancellation; no cloud service,
Docker, or arbitrary code execution from pipeline definitions; source files at or below 250
lines of code and no duplicated shared logic

**Scale/Scope**: Single-user MVP for CSV and Parquet datasets in the 1-5 GB target range;
three primary flows, seven initial transformation capabilities, two export formats, and one
desktop workspace

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

*GATE: PASS*

- SOLID and OOP boundaries are represented by independent engine domain, service, and adapter
  responsibilities.
- Backend work is planned test-first with unit, integration, and IPC contract coverage.
- Frontend work includes responsive, accessible state and error handling checks.
- The source layout keeps all application-specific code under `app/`.
- The design uses focused modules and explicitly enforces the 250-line source-file limit.
- Bounded IPC payloads preserve the local-first large-dataset architecture.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
app/
├── engine/
│   ├── pyproject.toml
│   ├── forma_engine/
│   │   ├── domain/             # Dataset, profile, transformation, job entities
│   │   ├── io/                 # CSV/Parquet readers and safe writers
│   │   ├── profiling/          # Profile orchestration and statistic calculators
│   │   ├── transformations/   # Validated cleaning operations and executor
│   │   ├── jobs/               # Job lifecycle, progress, and cancellation
│   │   └── ipc/                # NDJSON parsing, routing, response serialization
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── contract/
├── frontend/
│   └── desktop/
│       ├── src/
│       │   ├── features/       # explorer, profiling, cleaning, export
│       │   ├── components/     # shared accessible UI components
│       │   ├── stores/         # dataset, job, and workspace state
│       │   ├── services/       # typed IPC client and feature services
│       │   └── types/          # frontend contract types
│       ├── src-tauri/
│       │   └── src/            # native commands, sidecar lifecycle, and NDJSON relay
│       └── tests/
│           ├── unit/
│           ├── integration/
│           └── e2e/
├── fixtures/                   # small test datasets only
└── scripts/                    # repository quality and validation tooling
```

**Structure Decision**: Use a single desktop product under `app/` with an independent Python
engine and a React/Tauri frontend. Engine tests stay beside the engine, frontend tests stay
beside the desktop app, and fixtures remain inside `app/fixtures/`. No application source or
test code is placed at repository root.

## Constitution Check — Post-Design

*GATE: PASS*

- **SOLID/OOP**: `research.md` and `data-model.md` separate domain entities, IO adapters,
  profiling, transformations, jobs, and IPC responsibilities.
- **Backend TDD**: `quickstart.md` requires unit, integration, and contract tests before the
  implementation is considered complete.
- **Frontend UX**: the validation guide covers loading, error, progress, cancellation,
  responsive, keyboard, and accessible states.
- **Scope and architecture**: all product source and tests remain under `app/`; the engine is
  independent and the IPC contract limits responses to bounded data.
- **Code quality**: the source layout uses focused modules and the plan retains the 250-line
  limit and no-duplication review gate.
- **Privacy and safety**: research and contracts require local processing, source preservation,
  validated inputs, and safe export promotion.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | The selected two-runtime structure is required by the architecture and does not violate the constitution. |
