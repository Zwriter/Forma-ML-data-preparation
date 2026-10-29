---
description: "Executable implementation tasks for Clean Tab Operations"
---

# Tasks: Clean Tab Operations

**Input**: Design documents from `/specs/003-clean-tab-operations/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ipc.md](contracts/ipc.md), [quickstart.md](quickstart.md)

**Tests**: Required by the constitution. Backend tasks are TDD: the test task precedes and must fail before its implementation task.

## Phase 1: Setup

- [x] T001 Add a fixture with missing values, duplicate rows, a splittable name column, mergeable city/country columns, and numeric text in `app/fixtures/clean-tab-operations.csv`.

## Phase 2: Foundational (engine)

**Checkpoint**: New operations, validation, lineage, and preview markers exist in the engine before UI work.

- [x] T002 [P] Write failing unit tests for `replace_values`, `split_column`, `merge_columns`, `fill_null` previous/next, and `convert_type` `on_error` in `app/engine/tests/unit/transformations/test_cleaning_operations.py`.
- [x] T003 [P] Write failing unit tests for the new parameter rules and frame preconditions (convert failure count, mean/median/mode checks) in `app/engine/tests/unit/transformations/test_cleaning_validators.py`.
- [x] T004 Implement the operations in `app/engine/forma_engine/transformations/cleaning_operations.py` and dispatch them from `operations.py`.
- [x] T005 Implement parameter rules and preconditions in `app/engine/forma_engine/transformations/cleaning_validators.py`; delegate from `validators.py` and move the fill preconditions out of `executor.py`.
- [x] T006 [P] Write failing tests for column lineage in `app/engine/tests/unit/transformations/test_lineage.py`, then implement `app/engine/forma_engine/transformations/lineage.py`.
- [x] T007 [P] Write failing tests for per-step validation (cumulative schema, skip invalid, disabled steps) in `app/engine/tests/unit/services/test_step_validator.py`, then implement `app/engine/forma_engine/services/step_validator.py`.
- [x] T008 Write failing tests for removed-row markers, changed-cell markers, renamed columns, and full-dataset summary in `app/engine/tests/unit/services/test_cleaning_preview.py`, then implement `CleaningPreviewer` in `app/engine/forma_engine/services/cleaning_preview.py`.
- [x] T009 Write failing contract tests for `cleaning.validate`, multi-step `cleaning.preview`, legacy single-operation preview, limit bounds, and step-prefixed errors in `app/engine/tests/contract/test_clean_tab_ipc.py`, then implement them in `cleaning_service.py`, `cleaning_handlers.py`, and `router.py`.
- [x] T010 Add an integration test that applies a multi-step draft, verifies one history entry, undo restores the source, and the source file is unchanged in `app/engine/tests/integration/test_clean_tab_workflow.py`.

## Phase 3: User Story 1 - Build and Apply Steps (P1) — MVP

**Independent Test**: Add fill and remove-duplicates steps through forms, apply, verify one undoable change.

- [ ] T011 [P] [US1] Add `app/desktop/src/types/cleaning.ts` and the step catalog (titles, icons, ribbon mapping, summaries, defaults) in `app/desktop/src/features/cleaning/stepCatalog.ts` with tests in `app/desktop/tests/unit/cleaning/stepCatalog.test.ts`.
- [ ] T012 [US1] Write store tests, then implement `app/desktop/src/stores/cleaningStore.ts` (per-file drafts, add/update/toggle/move/duplicate/remove/clear, form state, stale flag) replacing `transformationStore.ts`.
- [ ] T013 [US1] Extend `app/desktop/src/features/cleaning/useCleaningJob.ts` with `validate` and multi-step `preview`.
- [ ] T014 [US1] Build `CleanTab.tsx`, `StepList.tsx`, `StepCard.tsx`, `AddStepMenu.tsx`, and the footer (step count, original-unchanged note, Cancel with confirmation, Apply N steps, Stop while running) in `app/desktop/src/features/cleaning/`.
- [ ] T015 [US1] Wire Clean ribbon commands to `cleaningStore.openForm` in `WorkspaceChrome.tsx`, render `CleanTab` from `WorkflowActions.tsx`, remove the old builder, comparison, and source-comparison block, and clear the draft on `clean` job completion in `useWorkflowJobEvents.ts`.

## Phase 4: User Story 4 - Fill, Replace, Convert (P1)

- [ ] T016 [P] [US4] Add shared form controls (column picker, multi-column picker, field errors) in `app/desktop/src/features/cleaning/forms/formControls.tsx`.
- [ ] T017 [US4] Build `FillForm`, `ReplaceForm`, `ConvertForm` in `app/desktop/src/features/cleaning/forms/valueForms.tsx` and `StepFormDialog.tsx`, with tests in `app/desktop/tests/unit/cleaning/valueForms.test.tsx` (numeric-only mean/median, constant value required, replace with missing).

## Phase 5: User Story 2 - Preview (P1)

- [ ] T018 [US2] Build `PreviewPanel.tsx` and `PreviewTable.tsx` (Before/After tabs, missing/changed/removed highlights, summary line, stale and error states) with tests in `app/desktop/tests/unit/cleaning/PreviewPanel.test.tsx`.

## Phase 6: User Story 3 - Manage Steps (P2)

- [ ] T019 [US3] Build `StepMenu.tsx` (Edit, Move up, Move down, Duplicate, Delete; arrow-key navigation, Escape) and the enabled switch, with tests in `app/desktop/tests/unit/cleaning/StepList.test.tsx`; show per-step validation errors on cards.

## Phase 7: User Story 5 - Remove, Rename, Split, Merge (P2)

- [ ] T020 [US5] Build `RemoveForm`, `RenameForm`, `SplitForm`, `MergeForm` in `app/desktop/src/features/cleaning/forms/structureForms.tsx` with tests in `app/desktop/tests/unit/cleaning/structureForms.test.tsx`.

## Phase 8: Polish & Cross-Cutting

- [ ] T021 Add Clean-tab styles with a stacked layout below 960 px in `app/desktop/src/styles/cleaning.css`.
- [ ] T022 Replace the JSON-builder tests in `tests/unit/cleaning/TransformationBuilder.test.tsx`, `tests/integration/profile-clean-workflow.test.tsx`, `tests/e2e/import-clean-export.spec.tsx`, and `tests/e2e/accessibility-responsive.spec.tsx` with guided-flow equivalents; add `tests/integration/clean-tab-workflow.test.tsx` (add → preview → apply → draft cleared; failure keeps draft).
- [ ] T023 Run quickstart automated checks: pytest, Ruff, Vitest, `tsc --noEmit`, Prettier, `check_source_limits.ps1`; record the constitution review in this file.

## Dependencies

- Phase 2 blocks all UI phases. T011–T012 block T013–T020. T016 blocks T017 and T020.
- US1 + US4 + US2 form the MVP; US3 and US5 are incremental.
