---

description: "Executable task list for the Forma MVP data preparation workflow"
---

# Tasks: Forma MVP Data Preparation Workflow

**Input**: Design documents from `/specs/001-forma-mvp/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/ipc.md](contracts/ipc.md), and [quickstart.md](quickstart.md)

**Organization**: Tasks are grouped by user story. Backend tests are written before the
implementation tasks they verify, following the project constitution's mandatory TDD policy.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the app-scoped Python engine, React/Tauri desktop shell, fixtures, and
reproducible development commands.

- [x] T001 Create the planned app-scoped directory tree in `app/engine/`, `app/frontend/desktop/`, and `app/fixtures/`.
- [x] T002 [P] Create the Python package manifest and development dependency groups in `app/engine/pyproject.toml` for Python 3.11, Polars, DuckDB, pytest, and test tooling.
- [x] T003 [P] Create the React/TypeScript/Vite package manifest and development scripts in `app/frontend/desktop/package.json` for the declared frontend dependencies and tests.
- [x] T004 [P] Initialize the Tauri 2 desktop shell and implement sidecar supervision, graceful shutdown, crash reporting, and NDJSON stdin/stdout relay in `app/frontend/desktop/src-tauri/tauri.conf.json`, `app/frontend/desktop/src-tauri/Cargo.toml`, `app/frontend/desktop/src-tauri/src/main.rs`, `app/frontend/desktop/src-tauri/src/sidecar.rs`, and `app/frontend/desktop/src-tauri/src/commands.rs`.
- [x] T005 [P] Add shared development configuration and ignore rules in `app/engine/pytest.ini`, `app/frontend/desktop/tsconfig.json`, `app/frontend/desktop/vite.config.ts`, and `app/frontend/desktop/.gitignore` without placing application code outside `app/`.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared domain, IPC, job, logging, and typed frontend boundaries required by
all user stories.

**Checkpoint**: No user story work begins until the engine can parse a request, return a correlated
response, emit a job event, and run a failing-then-passing backend test cycle.

- [x] T006 [P] Add failing unit tests for dataset, preview, transformation, job, and export domain invariants in `app/engine/tests/unit/domain/test_entities.py`.
- [x] T007 Implement domain entities and enums in `app/engine/forma_engine/domain/entities.py` and `app/engine/forma_engine/domain/errors.py`, enforcing the data-model rules that dataset `format` is `csv` or `parquet`, dataset `state` is `open`, `closed`, or `invalid`, preview `offset` is non-negative, preview `limit` is positive and capped, and job states transition only from `pending` to `running` to `completed`, `failed`, or `cancelled`.
- [x] T008 [P] Add failing NDJSON envelope and stable-error contract tests in `app/engine/tests/contract/test_ipc_envelopes.py` for non-empty request IDs, object params, correlated responses, bounded event fields, and the error codes defined in `contracts/ipc.md`.
- [x] T009 Implement NDJSON request, response, event, and error serialization in `app/engine/forma_engine/ipc/protocol.py`, including `INVALID_REQUEST`, `INTERNAL_ERROR`, and the stable error codes from `contracts/ipc.md`.
- [x] T010 [P] Add failing lifecycle and cancellation tests in `app/engine/tests/unit/jobs/test_job_manager.py` for pending, running, completed, failed, and cooperative cancelled jobs, including nullable indeterminate progress.
- [x] T011 Implement the job manager and progress event publisher in `app/engine/forma_engine/jobs/manager.py` and `app/engine/forma_engine/jobs/events.py`, preserving terminal states and emitting user-readable messages.
- [x] T012 [P] Add engine composition and logging tests in `app/engine/tests/unit/test_engine_composition.py` and configure structured diagnostic logging in `app/engine/forma_engine/core/logging.py` without writing diagnostics to protocol stdout.
- [x] T013 Implement the engine dependency composition root and sidecar entrypoint in `app/engine/forma_engine/bootstrap.py` and `app/engine/forma_engine/__main__.py`, wiring adapters through abstractions rather than coupling domain entities to Polars, DuckDB, or Tauri.
- [x] T014 [P] Define shared TypeScript contract types in `app/frontend/desktop/src/types/ipc.ts`, `app/frontend/desktop/src/types/dataset.ts`, and `app/frontend/desktop/src/types/job.ts`, then implement the typed sidecar client in `app/frontend/desktop/src/services/ipcClient.ts`.
- [x] T015 [P] Create the accessible desktop shell and shared workspace/job stores in `app/frontend/desktop/src/App.tsx`, `app/frontend/desktop/src/stores/workspaceStore.ts`, `app/frontend/desktop/src/stores/jobStore.ts`, and `app/frontend/desktop/src/styles/globals.css`, including loading, error, and empty states.

## Phase 3: User Story 1 - Import and Inspect a Dataset (Priority: P1) 🎯 MVP

**Goal**: Open valid CSV or Parquet files, validate them, display schema metadata, and show bounded
record previews without changing the source.

**Independent Test**: Open valid CSV and Parquet fixtures, verify schema and bounded records, reject
an invalid file with an actionable error, and confirm source bytes remain unchanged.

### Tests for User Story 1

- [x] T016 [P] [US1] Write failing reader and schema tests in `app/engine/tests/unit/io/test_readers.py` for valid CSV/Parquet files, unsupported formats, missing files, unreadable files, empty schemas, duplicate column names, and unknown row counts.
- [x] T017 [P] [US1] Write failing IPC contract tests in `app/engine/tests/contract/test_dataset_ipc.py` for `dataset.open` and `dataset.preview`, including request correlation, bounded `limit`, non-negative `offset`, and `DATASET_NOT_FOUND` responses.
- [x] T018 [P] [US1] Write the failing independent workflow test in `app/engine/tests/integration/test_dataset_open_preview.py` that opens fixtures, requests metadata and previews, and verifies source bytes are unchanged.

### Implementation for User Story 1

- [x] T019 [P] [US1] Implement CSV and Parquet reader adapters in `app/engine/forma_engine/io/readers.py`, validating readable paths, supported formats, schema availability, and the Dataset Reference rules that `source_path` must be readable and `columns` must be non-negative.
- [x] T020 [US1] Implement schema inspection and bounded preview services in `app/engine/forma_engine/io/schema_service.py` and `app/engine/forma_engine/services/dataset_service.py`, enforcing that preview records never exceed the engine-capped positive `limit`.
- [x] T021 [US1] Implement `dataset.open` and `dataset.preview` routing in `app/engine/forma_engine/ipc/dataset_handlers.py` and register the handlers in `app/engine/forma_engine/ipc/router.py`.
- [x] T022 [P] [US1] Build the dataset selector, schema summary, and bounded preview UI in `app/frontend/desktop/src/features/explorer/DatasetSelector.tsx`, `app/frontend/desktop/src/features/explorer/SchemaSummary.tsx`, and `app/frontend/desktop/src/features/explorer/DatasetPreview.tsx` with keyboard-accessible controls and clear invalid-file errors.
- [x] T023 [US1] Connect explorer state and pagination to the typed IPC client in `app/frontend/desktop/src/features/explorer/useDatasetExplorer.ts` and `app/frontend/desktop/src/stores/datasetStore.ts`, keeping only Dataset Reference metadata and bounded records in frontend state.
- [x] T024 [US1] Add frontend unit and workflow tests in `app/frontend/desktop/tests/unit/explorer/DatasetPreview.test.tsx` and `app/frontend/desktop/tests/integration/dataset-explorer.test.tsx` for loading, empty, invalid, schema, pagination, and source-preservation states.

**Checkpoint**: User Story 1 is independently demonstrable when the engine and desktop can open,
inspect, paginate, and reject datasets without modifying source files.

## Phase 4: User Story 2 - Profile and Clean Data (Priority: P1)

**Goal**: Profile an open dataset and apply validated duplicate, missing-value, column, type, and
row-filter operations while preserving the last valid result.

**Independent Test**: Open a fixture, request all applicable profile statistics, apply valid and
invalid transformations, verify before/after bounded previews, observe job states, and confirm the
source and last valid result survive failures or cancellation.

### Tests for User Story 2

- [x] T025 [P] [US2] Write failing profiling unit tests in `app/engine/tests/unit/profiling/test_profiler.py` for row/column counts, missing counts, distinct counts, type summaries, numeric summaries, categorical frequencies, duplicate counts, empty datasets, and pending/unknown values.
- [x] T026 [P] [US2] Write failing transformation validator tests in `app/engine/tests/unit/transformations/test_validator.py` for all seven types: `drop_duplicates`, `drop_null_rows`, `fill_null`, `rename_columns`, `drop_columns`, `convert_type`, and `filter_rows`, including invalid parameters, ordered operations, `fill_null` strategies (`constant`, `mean`, `median`, `mode`), and the FR-018 security acceptance criterion rejecting malformed or executable filter expressions.
- [x] T027 [P] [US2] Write failing transformation execution tests in `app/engine/tests/unit/transformations/test_executor.py` for sequential application, disabled operations, rollback to the last valid result, and source preservation.
- [x] T028 [P] [US2] Write failing profile/cleaning IPC contract tests in `app/engine/tests/contract/test_cleaning_ipc.py` for `dataset.profile`, `cleaning.preview`, `cleaning.apply`, progress events, structured failures, and cancellation.
- [x] T029 [P] [US2] Write the failing profile and cleaning workflow test in `app/engine/tests/integration/test_profile_clean_workflow.py` covering the independent story acceptance scenarios and all terminal job states.

### Implementation for User Story 2

- [x] T030 [P] [US2] Implement profile report entities and statistic calculators in `app/engine/forma_engine/profiling/report.py`, `app/engine/forma_engine/profiling/statistics.py`, and `app/engine/forma_engine/profiling/profiler.py`, distinguishing pending, unknown, zero, and calculated values.
- [x] T031 [P] [US2] Implement the transformation specification, safe filter parser, parameter validators, and operation adapters in `app/engine/forma_engine/transformations/specifications.py`, `app/engine/forma_engine/transformations/filter_parser.py`, `app/engine/forma_engine/transformations/validators.py`, and `app/engine/forma_engine/transformations/operations.py`; allow only column references, literals, `==`, `!=`, `<`, `<=`, `>`, `>=`, null checks, parentheses, and boolean `AND`/`OR`, and enforce the `fill_null` strategy rules.
- [x] T032 [US2] Implement sequential transformation execution and derived-result preservation in `app/engine/forma_engine/transformations/executor.py`, ensuring invalid parameters stop execution before success and the source Dataset Reference remains intact.
- [x] T033 [US2] Implement profiling and cleaning orchestration in `app/engine/forma_engine/services/profile_service.py` and `app/engine/forma_engine/services/cleaning_service.py`, submitting long-running work through the shared job manager.
- [x] T034 [US2] Implement `dataset.profile`, `cleaning.preview`, and `cleaning.apply` handlers in `app/engine/forma_engine/ipc/profile_handlers.py` and `app/engine/forma_engine/ipc/cleaning_handlers.py`, including `INVALID_TRANSFORMATION`, cancellation, and progress events.
- [x] T035 [P] [US2] Build the profile report and transformation builder UI in `app/frontend/desktop/src/features/profiling/ProfilePanel.tsx`, `app/frontend/desktop/src/features/cleaning/TransformationBuilder.tsx`, and `app/frontend/desktop/src/features/cleaning/TransformationValidation.tsx` with accessible validation messages.
- [x] T036 [US2] Connect profile and cleaning jobs to frontend stores and operation previews in `app/frontend/desktop/src/features/profiling/useProfileJob.ts`, `app/frontend/desktop/src/features/cleaning/useCleaningJob.ts`, and `app/frontend/desktop/src/stores/transformationStore.ts`.
- [x] T037 [US2] Add frontend unit and workflow tests in `app/frontend/desktop/tests/unit/cleaning/TransformationBuilder.test.tsx` and `app/frontend/desktop/tests/integration/profile-clean-workflow.test.tsx` for statistics, validation, before/after previews, progress, failure, cancellation, and responsive interaction.

**Checkpoint**: User Story 2 is independently demonstrable when profiling and every supported
cleaning operation can succeed, fail safely, or cancel without losing the source or last valid
working result.

## Phase 5: User Story 3 - Preview and Export Cleaned Data (Priority: P1)

**Goal**: Compare source and cleaned previews, safely export CSV and Parquet results, and reopen
outputs with verified schema and records.

**Independent Test**: Apply a deterministic cleaning operation, compare before and after previews,
export both supported formats, reopen each output, and verify overwrite and interruption behavior.

### Tests for User Story 3

- [x] T038 [P] [US3] Write failing safe-writer tests in `app/engine/tests/unit/io/test_safe_writers.py` for CSV/Parquet output, temporary destinations, post-write validation, explicit overwrite confirmation, and incomplete-output cleanup.
- [x] T039 [P] [US3] Write failing export IPC contract tests in `app/engine/tests/contract/test_export_ipc.py` for `export.csv`, `export.parquet`, `job.status`, and `job.cancel` with success, failure, and cancellation events.
- [x] T040 [P] [US3] Write the failing export workflow test in `app/engine/tests/integration/test_export_workflow.py` that verifies output schema/records, source byte preservation, unreadable destinations, interrupted exports, and overwrite behavior.
- [x] T041 [P] [US3] Write frontend comparison and export tests in `app/frontend/desktop/tests/integration/export-workflow.test.tsx` for before/after records, destination selection, overwrite confirmation, progress, failure, and completion states.

### Implementation for User Story 3

- [x] T042 [P] [US3] Implement validated CSV and Parquet safe writers in `app/engine/forma_engine/io/writers.py`, enforcing that `destination` is writable, `replaced_existing` is true only after explicit confirmation, and `validated` is true only after successful post-write validation.
- [x] T043 [US3] Implement export orchestration and result validation in `app/engine/forma_engine/services/export_service.py`, promoting a temporary output only after schema and row validation and cleaning up failed or cancelled temporary files.
- [x] T044 [US3] Implement export and job status/cancellation handlers in `app/engine/forma_engine/ipc/export_handlers.py` and `app/engine/forma_engine/ipc/job_handlers.py`, then register them in `app/engine/forma_engine/ipc/router.py`.
- [x] T045 [P] [US3] Build before/after comparison and export controls in `app/frontend/desktop/src/features/cleaning/BeforeAfterComparison.tsx`, `app/frontend/desktop/src/features/export/ExportDialog.tsx`, and `app/frontend/desktop/src/features/jobs/JobStatus.tsx` with explicit overwrite confirmation and accessible status text.
- [x] T046 [US3] Connect comparison, export, job polling/events, and cancellation to frontend services and stores in `app/frontend/desktop/src/features/export/useExportJob.ts`, `app/frontend/desktop/src/services/jobService.ts`, and `app/frontend/desktop/src/stores/exportStore.ts`.
- [x] T047 [US3] Add the full desktop end-to-end scenario in `app/frontend/desktop/tests/e2e/import-clean-export.spec.ts` covering CSV and Parquet output reopen, source preservation, invalid conversion, overwrite rejection, and cancelled export.

**Checkpoint**: User Story 3 is independently demonstrable when a cleaned result can be compared,
exported safely in both formats, reopened successfully, and never misreported after interruption.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the complete MVP against the constitution, performance goals, and quickstart.

- [x] T048 [P] Add large-dataset fixtures and bounded-preview performance measurements in `app/engine/tests/performance/test_large_dataset_preview.py` for the 1 GB target without transferring the complete dataset to frontend state.
- [x] T049 [P] Add frontend responsive, accessibility, and operation-state timing checks in `app/frontend/desktop/tests/e2e/accessibility-responsive.spec.tsx` for supported desktop window sizes, keyboard navigation, actionable errors, and an assertion that pending/running state is visible within 1 second of starting a long-running profile, cleaning, or export operation.
- [x] T050 [P] Add source-size and duplication review tooling in `app/scripts/check_source_limits.ps1` to fail when formatted production source files (including CSS) exceed 250 code lines or when the same shared logic is duplicated across feature modules; the limit must not be met through minification or compressed statements.
- [x] T051 [P] Document local development, sidecar startup, IPC diagnostics, and the no-HTTP transport decision in `docs/DEVELOPMENT.md` and `docs/IPC.md`; document CORS configuration requirements if a future HTTP-capable local integration is introduced.
- [x] T052 Run the complete backend, frontend, contract, and end-to-end validation described in `specs/001-forma-mvp/quickstart.md`, recording test output and measured behavior in `docs/MVP-VALIDATION.md`.
- [x] T053 Review the implementation against all constitution gates and MVP requirements in `specs/001-forma-mvp/spec.md`, resolving any unexplained duplication, oversized or minified source file, missing TDD evidence, missing PEP 8 or Prettier validation, inaccessible UI state, security acceptance failure, or source-preservation failure before release.
- [x] T054 [P] Add PEP 8-compatible formatting and lint tooling to `app/engine/pyproject.toml`, including dev dependencies and commands for `ruff check` and `ruff format --check`, enforce the configured 88-character line limit, then run both checks against the engine.
- [x] T055 [P] Add the repository Prettier configuration and `format:check` script to `app/frontend/desktop/package.json`, covering TypeScript, TSX, CSS, and JSON source files, then run the check.
- [x] T056 Align the constitution, implementation plan, quickstart, tasks, validation record, and source checks with the readable-formatting policy; verify source limits only after formatting and prohibit minification as a workaround.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001-T005 can begin immediately; T002-T005 are parallel after the directory tree exists.
- **Foundational (Phase 2)**: T006-T015 depend on setup; domain, IPC, jobs, and frontend boundary tasks become the shared blocking foundation.
- **User Stories (Phases 3-5)**: All depend on the foundational phase. US1 is the recommended first delivery slice; US2 and US3 can be developed in parallel at the engine level after foundation, but their integrated desktop workflows are most efficiently validated in US1 -> US2 -> US3 order.
- **Polish (Phase 6)**: Depends on the desired user stories being complete; T048-T051 and T054-T055 can run in parallel before T052-T053. T056 follows the constitution review.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2 and is the MVP slice. No dependency on another user story.
- **US2 (P1)**: Starts after Phase 2; its engine tests are independently runnable, while the desktop workflow consumes US1 dataset state.
- **US3 (P1)**: Starts after Phase 2; its engine tests are independently runnable, while the desktop workflow consumes the derived result from US2.

### Parallel Opportunities

- Setup: T002-T005 can run in parallel after T001.
- Foundation: T006, T008, T010, T012, T014, and T015 can be developed in parallel across separate files.
- US1: T016-T018 can run in parallel; T019 and T022 can proceed in parallel after their tests are written.
- US2: T025-T029 can run in parallel; T030, T031, and T035 can proceed in parallel after tests are written.
- US3: T038-T041 can run in parallel; T042 and T045 can proceed in parallel after their tests are written.
- Polish: T048-T051 and T054-T055 can run in parallel after the relevant implementation slices are available; T056 follows the constitution review.

## Implementation Strategy

### MVP First

1. Complete Phase 1 Setup and Phase 2 Foundation.
2. Complete Phase 3 User Story 1.
3. Stop and validate the independent import-and-inspect workflow.
4. Demonstrate bounded preview, schema inspection, invalid-file errors, and source preservation.

### Incremental Delivery

1. Add User Story 2 and validate profile, transformation, job, and rollback behavior.
2. Add User Story 3 and validate comparison, safe exports, reopening, and cancellation.
3. Complete Phase 6 performance, accessibility, packaging, documentation, and constitution review.

### TDD Execution Rule

For every backend behavior, complete its failing test task before its corresponding implementation
task. Keep the test suite green after each logical slice and preserve the last valid dataset state
when a test exposes a transformation or export failure.

## Notes

- Every task uses the required `- [ ] T### [P?] [US?] description` checklist format.
- `[P]` appears only where the task can be performed in parallel without an incomplete-file dependency.
- Story labels appear only in user-story phases; setup, foundation, and polish tasks intentionally have no story label.
- All application code and tests are under `app/`; planning and documentation artifacts remain under `specs/` and `docs/`.
