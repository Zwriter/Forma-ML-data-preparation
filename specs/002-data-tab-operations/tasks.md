---
description: "Executable implementation tasks for Data Tab Operations"
---

# Tasks: Data Tab Operations

**Input**: Design documents from `/specs/002-data-tab-operations/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ipc.md](contracts/ipc.md), [quickstart.md](quickstart.md)

**Tests**: Required by the project constitution. Backend tests follow TDD; IPC, frontend, responsive, and accessibility behavior receive focused automated coverage.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated as an incremental product slice.

## Phase 1: Setup

**Purpose**: Establish fixtures and focused module locations without changing runtime behavior.

- [x] T001 Add a representative Data-tab fixture containing text, numeric, date, null, category, and repeated-period columns in `app/fixtures/data-tab-operations.csv`.
- [x] T002 [P] Create the frontend data-operation module directory and test directories under `app/desktop/src/features/data-operations/` and `app/desktop/tests/unit/data-operations/`.
- [x] T003 [P] Create the engine test file locations for history, data operations, and save contracts under `app/engine/tests/unit/`, `app/engine/tests/contract/`, and `app/engine/tests/integration/`.

## Phase 2: Foundational

**Purpose**: Build the shared engine and frontend contracts required by every user story.

**Checkpoint**: History, operation validation boundaries, IPC envelopes, and shared frontend types are ready before story-specific UI work begins.

- [x] T004 [P] Write failing unit tests for per-dataset history cursors, saved cursors, dirty state, undo/redo boundaries, and redo invalidation in `app/engine/tests/unit/services/test_history_service.py`.
- [x] T005 [P] Write failing IPC contract tests for `dataset.history`, `dataset.undo`, `dataset.redo`, `dataset.save`, and `data.apply` validation in `app/engine/tests/contract/test_data_tab_ipc.py`.
- [x] T006 [P] Define `DatasetWorkingState`, `ChangeHistory`, `WorkingStateEntry`, operation constants, and history metadata serialization in `app/engine/forma_engine/domain/entities.py`.
- [x] T007 Implement the per-open-dataset history service with `current_index`, `saved_index`, `is_dirty`, `can_undo`, and `can_redo` transitions in `app/engine/forma_engine/services/history_service.py`, preserving the data-model rules that states start at the source, failed/cancelled operations add no state, and new operations after Undo invalidate later redo states.
- [x] T008 Integrate history ownership and current-state lookup into `app/engine/forma_engine/services/dataset_service.py`, including bounded preview projection from the current working state and reset-on-open behavior.
- [x] T009 Extend shared transformation validation and execution dispatch for the new operation names in `app/engine/forma_engine/transformations/validators.py`, `app/engine/forma_engine/transformations/operations.py`, and `app/engine/forma_engine/domain/entities.py` without weakening existing cleaning validation.
- [x] T010 Add the frontend operation specifications, history metadata, save state, and typed IPC result shapes in `app/desktop/src/types/dataOperations.ts` and `app/desktop/src/types/dataset.ts`.
- [x] T011 Extend the workspace and dataset stores with current history metadata, dirty/save status, selected projection columns, and operation result application in `app/desktop/src/stores/workspaceStore.ts` and `app/desktop/src/stores/datasetStore.ts`.
- [x] T012 Add shared frontend request helpers for data operations and history commands in `app/desktop/src/services/dataOperationClient.ts`, reusing `app/desktop/src/services/ipcClient.ts` and the existing job event protocol.

## Phase 3: User Story 1 - Save and Recover Workspace Changes (Priority: P1) - MVP

**Goal**: Make Save, Undo, and Redo reliable workspace actions with Data-tab-only buttons, global shortcuts, dirty tracking, and close protection.

**Independent Test**: Open the fixture, apply a successful operation, verify dirty state, undo and redo it, save it with overwrite confirmation, and exercise Save/Discard/Cancel during a close request.

### Tests for User Story 1

- [x] T013 [P] [US1] Add unit tests for the workspace store's dirty state, save state, history availability, and command dispatch in `app/desktop/tests/unit/workspace/save-history.test.tsx`.
- [x] T014 [P] [US1] Add frontend integration tests for Data-tab-only button visibility and Ctrl+S/Ctrl+Z/Ctrl+X behavior outside editable fields in `app/desktop/tests/integration/save-undo-redo.test.tsx`.
- [x] T015 [P] [US1] Add engine integration tests for safe Save success, explicit overwrite rejection, failed save cursor preservation, and current-state serialization in `app/engine/tests/integration/test_save_workflow.py`.

### Implementation for User Story 1

- [x] T016 [US1] Add `dataset.history`, `dataset.undo`, `dataset.redo`, and `dataset.save` handlers with request validation and stable error codes in `app/engine/forma_engine/ipc/dataset_handlers.py`.
- [x] T017 [US1] Register history and save routes and connect job completion results to the existing event protocol in `app/engine/forma_engine/ipc/router.py` and `app/engine/forma_engine/services/dataset_service.py`.
- [x] T018 [US1] Implement safe Save of the current working frame through `app/engine/forma_engine/io/writers.py`, preserving the existing temporary-file validation and explicit overwrite behavior.
- [x] T019 [US1] Make existing cleaning results enter the shared history and return current dataset plus history metadata from `app/engine/forma_engine/services/cleaning_service.py`.
- [x] T020 [US1] Implement workspace Save, Undo, Redo, and operation-result actions in `app/desktop/src/features/workspace/useWorkspaceHistory.ts` and `app/desktop/src/stores/workspaceStore.ts`.
- [x] T021 [US1] Wire Save, Undo, and Redo buttons to real handlers while rendering them only for the Data tab and reflecting disabled availability in `app/desktop/src/features/workspace/WorkspaceChrome.tsx`.
- [x] T022 [US1] Register one workspace-level keyboard handler for Ctrl+S, Ctrl+Z, and Ctrl+X, excluding text-editing fields, in `app/desktop/src/App.tsx` and `app/desktop/src/features/workspace/useWorkspaceHistory.ts`.
- [x] T023 [US1] Add the Save/Discard/Cancel close confirmation dialog and Tauri close-request guard in `app/desktop/src/features/workspace/SaveConfirmDialog.tsx` and `app/desktop/src/App.tsx`.
- [x] T024 [US1] Integrate history metadata, save status, failed-save recovery, and close-request behavior with job events and dataset loading in `app/desktop/src/features/workspace/WorkflowActions.tsx` and `app/desktop/src/App.tsx`.

**Checkpoint**: User Story 1 is independently usable and testable before the Data-tab operation dialogs are added.

## Phase 4: User Story 2 - Choose and Inspect Relevant Columns (Priority: P1)

**Goal**: Let users select, search, reorder, select all, clear all, and confirm multiple visible columns without mutating the dataset or dirtying history.

**Independent Test**: Open a multi-column fixture, use Select column to search and select several columns, confirm the projection, and verify an empty selection is rejected while values remain unchanged.

### Tests for User Story 2

- [ ] T025 [P] [US2] Add component tests for multi-select, search, Select all, Clear all, confirmation, empty-selection validation, keyboard navigation, and accessible states in `app/desktop/tests/unit/data-operations/ColumnSelector.test.tsx`.
- [ ] T026 [P] [US2] Add integration tests proving confirmed column projections affect bounded previews but do not create history entries or dirty state in `app/desktop/tests/integration/dataset-explorer.test.tsx`.

### Implementation for User Story 2

- [ ] T027 [US2] Implement the accessible multi-column selection popup with draft selection, search, Select all, Clear all, ordered confirmation, and validation in `app/desktop/src/features/data-operations/ColumnSelector.tsx`.
- [ ] T028 [US2] Store confirmed projection columns and request bounded projected previews through `app/desktop/src/features/explorer/useDatasetExplorer.ts`, `app/desktop/src/stores/datasetStore.ts`, and `app/desktop/src/services/dataOperationClient.ts`.
- [ ] T029 [US2] Replace single-column selection wording and behavior with multi-column selection state in `app/desktop/src/features/explorer/DatasetPreview.tsx` and `app/desktop/src/features/explorer/SchemaSummary.tsx`.
- [ ] T030 [US2] Wire the Select column ribbon command and Data-tab table control to open and close the selector without changing the working history in `app/desktop/src/App.tsx` and `app/desktop/src/features/workspace/WorkspaceChrome.tsx`.
- [ ] T031 [US2] Add responsive and keyboard-accessible styling for the selector popup in `app/desktop/src/styles/explorer.css` and `app/desktop/src/styles/workspace-content.css`.

**Checkpoint**: User Story 2 works independently and leaves Save/Undo/Redo history unchanged.

## Phase 5: User Story 3 - Filter and Sort Records (Priority: P1)

**Goal**: Apply safe, typed, full-dataset filtering and deterministic multi-key sorting through familiar controls.

**Independent Test**: Apply text, numeric, empty-value, and date filters with all/any combinations, sort by multiple keys, and verify row counts, ordering, missing-value placement, and invalid-input behavior across preview pages.

### Tests for User Story 3

- [ ] T032 [P] [US3] Write failing unit tests for filter rule validation and Polars execution covering every supported operator, type compatibility, null checks, case sensitivity, all/any logic, and executable-input rejection in `app/engine/tests/unit/transformations/test_filter_operations.py`.
- [ ] T033 [P] [US3] Write failing unit tests for ordered multi-key sorting, ascending/descending direction, null placement, equal-key stability, and row preservation in `app/engine/tests/unit/transformations/test_sort_operations.py`.
- [ ] T034 [P] [US3] Add IPC contract tests for `data.apply` filter and sort payloads and stable invalid-operation errors in `app/engine/tests/contract/test_data_operations_ipc.py`.
- [ ] T035 [P] [US3] Add frontend component tests for FilterBuilder and SortBuilder validation, editable rules/keys, empty results, loading states, and accessible labels in `app/desktop/tests/unit/data-operations/FilterSortBuilders.test.tsx`.

### Implementation for User Story 3

- [ ] T036 [US3] Implement typed filter and sort validators, including the data-model enums and required-value rules, in `app/engine/forma_engine/transformations/validators.py`.
- [ ] T037 [US3] Implement safe Polars filter expression compilation and deterministic multi-key sorting in `app/engine/forma_engine/transformations/operations.py` and `app/engine/forma_engine/transformations/filter_parser.py`.
- [ ] T038 [US3] Add the `data.apply` handler/service path for filter and sort jobs, including current-state history commits and bounded result metadata, in `app/engine/forma_engine/ipc/data_operation_handlers.py`, `app/engine/forma_engine/ipc/router.py`, and `app/engine/forma_engine/services/data_operation_service.py`.
- [ ] T039 [US3] Implement the non-code FilterBuilder and SortBuilder dialogs with typed controls, all/any mode, clear/edit actions, validation messages, missing-value choices, and operation status in `app/desktop/src/features/data-operations/FilterBuilder.tsx` and `app/desktop/src/features/data-operations/SortBuilder.tsx`.
- [ ] T040 [US3] Wire Filter row and Sort ribbon commands, dialogs, operation submission, result application, row counts, and explicit empty-result states in `app/desktop/src/App.tsx`, `app/desktop/src/features/workspace/WorkflowActions.tsx`, and `app/desktop/src/features/explorer/DatasetPreview.tsx`.
- [ ] T041 [US3] Add integration coverage for filter and sort workflows across the frontend mock engine boundary in `app/desktop/tests/integration/data-operations-workflow.test.tsx`.

**Checkpoint**: User Stories 1 through 3 work independently; filter and sort operations are safe, full-dataset, reversible changes.

## Phase 6: User Story 4 - Summarize and Reshape Data (Priority: P2)

**Goal**: Provide guided Group by, Pivot, and Unpivot operations for non-technical users with deterministic schemas and validation.

**Independent Test**: Group a fixture with multiple aggregates, pivot repeated category intersections, unpivot repeated-period columns, and verify invalid role combinations preserve the last valid state.

### Tests for User Story 4

- [ ] T042 [P] [US4] Write failing unit tests for Group by aggregates, numeric compatibility, duplicate output names, empty inputs, and deterministic group keys in `app/engine/tests/unit/transformations/test_group_operations.py`.
- [ ] T043 [P] [US4] Write failing unit tests for Pivot duplicate intersections, supported aggregations, generated column names, invalid roles, and empty inputs in `app/engine/tests/unit/transformations/test_pivot_operations.py`.
- [ ] T044 [P] [US4] Write failing unit tests for Unpivot identifier preservation, selected value columns, output-name collisions, empty selections, and generated row counts in `app/engine/tests/unit/transformations/test_unpivot_operations.py`.
- [ ] T045 [P] [US4] Add IPC contract tests for Group by, Pivot, and Unpivot payload validation and completion metadata in `app/engine/tests/contract/test_reshape_operations_ipc.py`.
- [ ] T046 [P] [US4] Add component tests for GroupBuilder, PivotBuilder, and UnpivotBuilder role selection, aggregate controls, validation, accessible labels, and empty/loading states in `app/desktop/tests/unit/data-operations/ReshapeBuilders.test.tsx`.

### Implementation for User Story 4

- [ ] T047 [US4] Implement Group by, Pivot, and Unpivot validators with the exact data-model constraints for role uniqueness, aggregate support, numeric compatibility, and output-name collisions in `app/engine/forma_engine/transformations/validators.py`.
- [ ] T048 [US4] Implement Polars Group by, Pivot, and Unpivot operations with stable output schemas and full-dataset execution in `app/engine/forma_engine/transformations/operations.py`.
- [ ] T049 [US4] Extend the data-operation service and handler routing for reshape jobs, history commits, cancellation, and failure preservation in `app/engine/forma_engine/services/data_operation_service.py`, `app/engine/forma_engine/ipc/data_operation_handlers.py`, and `app/engine/forma_engine/ipc/router.py`.
- [ ] T050 [US4] Implement accessible GroupBuilder, PivotBuilder, and UnpivotBuilder dialogs using common-language labels and typed role controls in `app/desktop/src/features/data-operations/GroupBuilder.tsx`, `app/desktop/src/features/data-operations/PivotBuilder.tsx`, and `app/desktop/src/features/data-operations/UnpivotBuilder.tsx`.
- [ ] T051 [US4] Wire Group by, Pivot, and Unpivot commands to operation submission, result previews, schema updates, history metadata, and actionable errors in `app/desktop/src/App.tsx` and `app/desktop/src/features/workspace/WorkflowActions.tsx`.
- [ ] T052 [US4] Add end-to-end reshape coverage for Group by, Pivot, and Unpivot using the representative fixture in `app/desktop/tests/e2e/data-tab-operations.spec.tsx`.

**Checkpoint**: All four user stories are independently demonstrable, with reshape failures preserving the last valid state.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify the integrated feature against constitutional quality gates and the quickstart.

- [ ] T053 [P] Add responsive and accessibility assertions for all Data-tab dialogs, toolbar controls, close confirmation, and keyboard shortcuts in `app/desktop/tests/e2e/accessibility-responsive.spec.tsx`.
- [ ] T054 [P] Add large-dataset performance coverage proving bounded previews and visible operation states without full frontend transfer in `app/engine/tests/performance/test_data_operations_bounded_preview.py`.
- [ ] T055 [P] Update feature and developer validation references for the new IPC methods and workflows in `docs/IPC.md` and `docs/DEVELOPMENT.md`.
- [ ] T056 Run the complete backend suite, Ruff checks, frontend tests, TypeScript build, Prettier checks, source-limit script, and every scenario in `specs/002-data-tab-operations/quickstart.md`.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; fixture and directory tasks can start immediately.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories because every story uses shared history, typed operations, IPC, and store contracts.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP slice.
- **User Story 2 (Phase 4)**: Depends on Foundational; can be implemented independently of US1 except for shared dataset loading and preview state.
- **User Story 3 (Phase 5)**: Depends on Foundational and the current-state history integration from US1 before its operations can be reversible.
- **User Story 4 (Phase 6)**: Depends on Foundational and the `data.apply` path established in US3; it can reuse the same operation service and builder conventions.
- **Polish (Phase 7)**: Depends on all desired stories being complete.

### User Story Dependencies

- **US1**: No dependency on another user story after Foundational; delivers the MVP.
- **US2**: No behavioral dependency on US1; uses shared dataset/preview contracts and must not dirty history.
- **US3**: Requires US1's history commit/result integration so filter and sort are undoable and saveable.
- **US4**: Requires US3's `data.apply` service/handler path and operation-builder conventions; reshape logic remains independently testable.

### Dependency Graph

```text
Setup
  -> Foundational
       -> US1 (MVP)
       -> US2
       -> US3 -> US4
       -> Polish (after selected stories)
```

### Parallel Opportunities

- Phase 1 tasks T002 and T003 can run in parallel with the fixture task T001.
- Foundational tests T004-T005, domain work T006, frontend types T010, and client scaffolding T012 can be split across engine and desktop owners after the paths are created.
- US1 tests T013-T015 can run in parallel before implementation; T016-T019 are engine-focused while T020-T024 are desktop-focused after the shared contracts are stable.
- US2 tests T025-T026 can run in parallel; T027-T029 are separate UI/state slices before T030 wiring.
- US3 backend tests T032-T034 and frontend tests T035 can run in parallel; backend execution T036-T038 and frontend builders T039 can proceed in parallel before T040 integration.
- US4 tests T042-T046 can run in parallel; backend reshape work T047-T049 and frontend builders T050 can proceed in parallel before T051 wiring.
- Polish tasks T053-T055 can run in parallel; T056 is the final integrated validation.

## Parallel Examples

### User Story 1

```text
Task: T013 frontend workspace history unit tests in app/desktop/tests/unit/workspace/save-history.test.tsx
Task: T014 frontend shortcut and button integration tests in app/desktop/tests/integration/save-undo-redo.test.tsx
Task: T015 backend save integration tests in app/engine/tests/integration/test_save_workflow.py
```

### User Story 3

```text
Task: T032 filter transformation tests in app/engine/tests/unit/transformations/test_filter_operations.py
Task: T033 sort transformation tests in app/engine/tests/unit/transformations/test_sort_operations.py
Task: T035 FilterBuilder and SortBuilder tests in app/desktop/tests/unit/data-operations/FilterSortBuilders.test.tsx
```

### User Story 4

```text
Task: T042 Group by tests in app/engine/tests/unit/transformations/test_group_operations.py
Task: T043 Pivot tests in app/engine/tests/unit/transformations/test_pivot_operations.py
Task: T044 Unpivot tests in app/engine/tests/unit/transformations/test_unpivot_operations.py
Task: T046 reshape builder tests in app/desktop/tests/unit/data-operations/ReshapeBuilders.test.tsx
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 Setup and Phase 2 Foundational.
2. Complete Phase 3 User Story 1.
3. Run the US1 backend, IPC, frontend, and close-request tests.
4. Demonstrate Save, Undo, Redo, Ctrl+S/Z/X, dirty state, and close recovery before adding other operations.

### Incremental Delivery

1. Add US2 column projection without changing history semantics.
2. Add US3 filter and sort as the first reversible Data-tab transformations.
3. Add US4 Group by, Pivot, and Unpivot using the same typed operation boundary.
4. Complete Polish validation and the quickstart evidence record.

### Task Format Validation

All implementation tasks use the required `- [ ] T###` checklist format. Parallelizable tasks
are marked `[P]`, user-story tasks are labeled `[US1]` through `[US4]`, and every task description
contains a concrete repository file path.



