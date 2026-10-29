# Feature Specification: Data Tab Operations

**Feature Branch**: `002-data-tab-operations`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "i want to add functionality to the data tab: save will save current changes (and a dialog will appear if the user tries to close the window without saving); undo will undo the last changes; redo will undo the last undo's; select column will open a popup where you can select more than one column; filter row will filter the entire file based on usual criterias; sort will sort the entire file based on usual cryterias; group by will group the columns simmilar to GROUP BY in sql, but for non techical users pivot and unpivot work the same as in sql but for non technical audience"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save and Recover Workspace Changes (Priority: P1)

As a data analyst, I want to save changes and recover from mistakes from anywhere in the workspace so that I can work confidently without losing useful edits.

**Why this priority**: Persistence and recovery are workspace-wide foundations for every operation, regardless of which tab is active.

**Independent Test**: Open a supported dataset, apply an operation, verify the dataset is marked as changed, undo and redo it, save the result, and attempt to close with and without saved changes.

**Acceptance Scenarios**:

1. **Given** an open dataset with no pending changes, **when** the user applies a supported Data-tab operation, **then** the workspace indicates that changes are unsaved.
2. **Given** unsaved changes, **when** the user selects Save, **then** the current result is written to the active dataset location after any required replacement confirmation and the workspace indicates that it is saved.
3. **Given** unsaved changes, **when** the user tries to close the application, **then** a dialog offers the choices to save, discard changes, or cancel closing.
4. **Given** a change history with an undoable operation, **when** the user selects Undo, **then** the most recent change is removed and the result reflects the preceding state.
5. **Given** one or more undone changes, **when** the user selects Redo, **then** the most recently undone change is restored in its original order.
6. **Given** a new operation after Undo, **when** the user selects Redo, **then** redo entries that no longer describe the current history are unavailable.
7. **Given** any workspace tab is active, **when** the user presses Ctrl+S, Ctrl+Z, or Ctrl+X outside a text-editing field, **then** the workspace performs Save, Undo, or Redo respectively.
8. **Given** a non-Data tab is active, **when** the user needs Save, Undo, or Redo, **then** the keyboard shortcuts remain available even though the toolbar buttons are not displayed on that tab.

### User Story 2 - Choose and Inspect Relevant Columns (Priority: P1)

As a data analyst, I want to choose several columns from a clear selection popup so that table operations can focus on the fields relevant to my task.

**Why this priority**: Column selection is a shared prerequisite for sorting, grouping, and reshaping and must remain usable for wide datasets.

**Independent Test**: Open a dataset with multiple columns, open Select column, select and deselect several fields, confirm the selection, and verify the table reflects the chosen columns.

**Acceptance Scenarios**:

1. **Given** an open dataset, **when** the user opens Select column, **then** a popup lists every available column with a clear selected or unselected state.
2. **Given** the column selection popup, **when** the user selects multiple columns and confirms, **then** the table displays those columns in the chosen order.
3. **Given** the popup, **when** the user searches for a column or chooses Select all or Clear all, **then** the displayed selection updates without changing the underlying values.
4. **Given** a selection that would leave no visible columns, **when** the user confirms, **then** the action is rejected with an actionable message and the previous selection remains.

### User Story 3 - Filter and Sort Records (Priority: P1)

As a non-technical user, I want to filter and sort the complete dataset using familiar controls so that I can find and organize records without writing expressions.

**Why this priority**: Filtering and sorting are the most common ways to answer questions from a table and provide immediate value.

**Independent Test**: Apply filters using text, numeric, empty-value, and date criteria to a representative dataset, combine criteria, sort by multiple columns, and verify the resulting order and row set.

**Acceptance Scenarios**:

1. **Given** an open dataset, **when** the user opens Filter row, **then** the user can choose a column, a familiar operator, and a comparison value without entering executable code.
2. **Given** multiple filter conditions, **when** the user combines them with all or any matching logic, **then** the table shows only rows satisfying the selected logic across the entire file.
3. **Given** text, numeric, date, and empty values, **when** the user chooses the corresponding supported criteria, **then** comparisons use the column's value type and present invalid values before applying the filter.
4. **Given** an active filter, **when** the user clears or edits it, **then** the table updates and the full dataset remains available for subsequent operations.
5. **Given** an open dataset, **when** the user sorts by one or more columns in ascending or descending order, **then** the entire file is ordered by the selected keys and tie-breakers in the displayed priority order.
6. **Given** missing values during sorting, **when** the user applies a sort, **then** missing values are placed consistently according to the selected ordering and the interface communicates that behavior.

### User Story 4 - Summarize and Reshape Data (Priority: P2)

As a non-technical user, I want guided grouping, pivoting, and unpivoting so that I can summarize or reshape a table without knowing SQL terminology.

**Why this priority**: These operations unlock analysis workflows after the user can reliably select, filter, and sort data.

**Independent Test**: Use a dataset with category, measure, and repeated-period columns to create a grouped summary, pivot it into a cross-tab, and unpivot a wide table back into attribute-value rows.

**Acceptance Scenarios**:

1. **Given** an open dataset, **when** the user opens Group by, **then** the dialog lets the user select one or more grouping columns and one or more calculations such as count, sum, average, minimum, or maximum for eligible value columns.
2. **Given** a valid grouping configuration, **when** the user applies it, **then** the result contains one row per distinct grouping combination and clearly named summary columns.
3. **Given** an open dataset, **when** the user opens Pivot, **then** the dialog guides the user to choose row labels, a column category, a value column, and a calculation.
4. **Given** a valid pivot configuration, **when** the user applies it, **then** the result presents category values as columns and aggregates duplicate intersections using the chosen calculation.
5. **Given** a wide dataset, **when** the user opens Unpivot, **then** the dialog lets the user keep identifier columns and choose the columns to turn into attribute-value rows.
6. **Given** a valid unpivot configuration, **when** the user applies it, **then** the selected wide columns become an attribute column and a value column while identifier values are repeated for each generated row.
7. **Given** an operation with missing, incompatible, or duplicate configuration fields, **when** the user attempts to apply it, **then** the dialog identifies the problem and leaves the last valid dataset state unchanged.

### Edge Cases

- Saving a result to an existing location requires explicit confirmation before replacement; cancelling preserves the unsaved state.
- A save, transformation, or close action may fail or be cancelled; the interface must report the outcome and preserve the last valid state.
- Undo and redo are unavailable when their respective history is empty and must not change the dataset.
- A new dataset load starts a separate change history and must not apply the previous dataset's undo or redo entries.
- Filters may match zero rows; the interface must show an explicit empty-result state rather than treating it as an error.
- A filter value may be incompatible with the selected column type, a column may contain nulls, and text matching may be case-sensitive or insensitive only when the user selects that option.
- Sorting a dataset with equal keys must preserve a consistent tie order, and sorting must not silently discard rows.
- Grouping or pivoting an empty dataset, a dataset with no eligible measure values, or a dataset with duplicate category intersections must show a clear result or validation message.
- Unpivoting with no identifier columns or no value columns must be rejected with an actionable message.
- Large files must remain processable without requiring every row to be loaded into the interface at once; previews and result summaries may be bounded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to apply the supported Data-tab operations to the current dataset: column selection, row filtering, sorting, grouping, pivoting, and unpivoting.
- **FR-002**: The system MUST track whether the current dataset differs from its last saved state and MUST show that state in the workspace.
- **FR-003**: Users MUST be able to save the current dataset result to the active dataset location, with explicit confirmation before replacing an existing file.
- **FR-004**: When the user attempts to close with unsaved changes, the system MUST offer Save, Discard changes, and Cancel, and MUST close only after the selected action succeeds or the user chooses discard.
- **FR-005**: The system MUST maintain an ordered history of successful workspace changes that affect the current dataset, regardless of the active tab, and MUST provide Undo and Redo controls with correct availability states.
- **FR-006**: Applying a new change after Undo MUST discard redo states that no longer follow the current history.
- **FR-007**: The Select column interaction MUST support selecting multiple columns, searching or scanning the available columns, selecting all, clearing all, confirming the selection, and rejecting an empty final selection.
- **FR-008**: Row filtering MUST support familiar, non-code criteria for equality, inequality, contains, begins with, ends with, greater than, less than, greater than or equal to, less than or equal to, is empty, and is not empty where applicable to the selected value type.
- **FR-009**: Users MUST be able to combine multiple filter conditions with all-match or any-match logic, edit or clear active filters, and see the resulting row count or empty state.
- **FR-010**: Sorting MUST support one or more ordered sort keys, ascending and descending direction, consistent missing-value placement, and preservation of all records.
- **FR-011**: Group by MUST support one or more grouping columns and count, sum, average, minimum, and maximum calculations where valid, with understandable labels in the result.
- **FR-012**: Pivot MUST support row-label columns, a category column, a value column, and a selected calculation, and MUST aggregate repeated intersections according to that calculation.
- **FR-013**: Unpivot MUST support identifier columns and selected value columns and MUST produce understandable attribute and value fields without losing identifier values.
- **FR-014**: The system MUST validate operation settings before applying them and MUST preserve the last valid dataset state when validation or execution fails.
- **FR-015**: The system MUST report successful, failed, cancelled, and in-progress states for save and dataset operations, with an actionable explanation when an action cannot complete.
- **FR-016**: Data-tab operations MUST apply to the full dataset while the interface may show bounded previews, row counts, and summaries rather than transferring every record to the user interface.
- **FR-017**: The system MUST preserve the source file until the user explicitly saves changes to that location or chooses another supported persistence action.
- **FR-018**: Filter criteria MUST be treated as data and MUST NOT execute user-provided code or arbitrary expressions.
- **FR-019**: The Save, Undo, and Redo buttons MUST be visible in the Data tab only; their underlying actions MUST remain available while other workspace tabs are active.
- **FR-020**: The workspace MUST interpret Ctrl+S as Save, Ctrl+Z as Undo, and Ctrl+X as Redo from any workspace tab when focus is not inside a text-editing field, and MUST preserve normal text editing behavior inside such fields.
- **FR-021**: Data-tab controls and dialogs MUST be keyboard accessible, expose meaningful labels and states to assistive technology, and remain usable at supported desktop window sizes.

### Key Entities

- **Dataset Working State**: The current full-dataset result, its schema, source location, save status, and available operation history.
- **Change History**: The ordered successful operations and reversible states associated with one working dataset.
- **Column Selection**: The ordered set of columns currently included in the table view or selected for an operation.
- **Filter Rule Set**: One or more typed, non-code conditions combined with all-match or any-match logic.
- **Sort Specification**: An ordered list of columns, directions, and missing-value placement choices.
- **Grouped Summary**: A result defined by grouping columns and named aggregate calculations.
- **Pivot Specification**: The row labels, category field, value field, and aggregation used to create a cross-tab result.
- **Unpivot Specification**: Identifier fields and selected wide fields converted into attribute-value rows.
- **Save State**: Whether the working state is saved, has pending changes, is saving, or failed to save.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of representative first-time users can apply a filter and sort a dataset without assistance.
- **SC-002**: At least 90% of representative first-time users can configure a grouped summary, pivot, or unpivot operation without using technical query terminology.
- **SC-003**: For supported operation configurations, at least 95% of valid cases produce the expected row set, ordering, grouping, or reshaped schema when compared with a reference result.
- **SC-004**: At least 95% of invalid configurations and failed saves show an actionable message and preserve the last valid dataset state.
- **SC-005**: Users can distinguish saved from unsaved work within 2 seconds of making a change, and every close attempt with unsaved work presents the recovery dialog.
- **SC-006**: On a representative dataset, Undo and Redo restore the correct prior or subsequent state within 1 second after the command is issued from either the Data tab buttons or a workspace keyboard shortcut.
- **SC-007**: At least 95% of save operations that report success produce a readable file whose records and schema match the current working state.
- **SC-008**: Data-tab operations on a representative large dataset show a visible running or completed state within 1 second without requiring the full dataset to appear in the interface.
- **SC-009**: Accessibility and responsive checks find no blocking keyboard-navigation or supported-window-layout failures in the Data-tab dialogs and toolbar controls.

## Assumptions

- The feature targets the existing local desktop workflow and the currently supported dataset formats.
- Save means persisting the current working result to the active dataset location after explicit replacement confirmation; the source remains unchanged until the user confirms that action.
- One active dataset is edited at a time; loading another dataset starts a new history.
- Save, Undo, and Redo are workspace actions even though their visible buttons are intentionally limited to the Data tab; keyboard shortcuts are the access path from other tabs.
- Ctrl+X is reserved for Redo at workspace level when focus is outside a text-editing field; native cut behavior remains available inside text-editing fields.
- The existing bounded-preview model remains in place, so operation results may be represented by metadata, counts, and bounded records in the interface.
- Date criteria use recognizable values from the selected column, while users receive validation feedback for values that cannot be interpreted for that column.
- Text filtering defaults to case-insensitive matching unless the user chooses a case-sensitive option where available.
- Operation dialogs may use common-language labels such as "summarize", "turn categories into columns", and "turn columns into rows" alongside familiar operation names.
- Advanced joins, calculated expressions, custom aggregate formulas, database queries, collaborative editing, and multi-user permissions are outside this feature.
