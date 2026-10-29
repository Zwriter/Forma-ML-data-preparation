# Feature Specification: Clean Tab Operations

**Feature Branch**: `003-clean-tab-operations`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "implement the functionality of the 'clean' tab"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build and Apply a List of Cleaning Steps (Priority: P1)

As a data analyst, I want to add cleaning steps through guided forms, see them as an ordered list,
and apply them together so that I can clean a dataset without writing scripts or JSON.

**Why this priority**: The Clean tab currently requires raw JSON parameters. A guided step list
with apply is the minimum that makes the tab usable and delivers the import-clean-export MVP.

**Independent Test**: Open a dataset, add a "Fill missing values" step and a "Remove duplicates"
step through the forms, apply them, and verify the dataset reflects both steps and the change can
be undone.

**Acceptance Scenarios**:

1. **Given** an open dataset on the Clean tab, **when** the user chooses Add step or a Clean
   ribbon command, **then** a form opens for that step type with column pickers and labelled
   options instead of free-text code.
2. **Given** a completed step form, **when** the user confirms it, **then** the step appears at
   the end of the step list with a number, a readable title, and a one-line summary of its
   settings (for example "Column: TotalCharges • Strategy: median").
3. **Given** a step list with one or more enabled steps, **when** the user selects Apply, **then**
   the enabled steps run in list order on the full dataset, the result becomes the current
   dataset, the step list is cleared, and the workspace shows unsaved changes.
4. **Given** an applied set of steps, **when** the user selects Undo, **then** the whole applied
   set is reverted as one change.
5. **Given** a step list, **when** the user selects Cancel, **then** the draft steps are discarded
   after confirmation and the dataset is unchanged.
6. **Given** a step whose settings are invalid for the dataset, **when** the user confirms the
   form or applies the list, **then** the problem is identified on that step and the dataset is
   left unchanged.

---

### User Story 2 - Preview Changes Before Applying (Priority: P1)

As a data analyst, I want to compare a sample of my data before and after the configured steps
so that I can verify the effect before committing it.

**Why this priority**: Previewing before committing is a core product requirement (US-004) and
prevents mistakes on large datasets.

**Independent Test**: Configure fill and duplicate-removal steps, choose Preview changes, and
verify the before and after tables show the sample with filled and removed values highlighted
and a summary of the counts.

**Acceptance Scenarios**:

1. **Given** at least one enabled step, **when** the user chooses Preview changes, **then** a
   Before tab and an After tab show the same bounded sample of rows as a readable table, not raw
   text.
2. **Given** a preview, **when** values are filled, replaced, or converted, **then** the changed
   cells are highlighted in the After view and missing cells are marked in the Before view.
3. **Given** a preview, **when** rows are removed, **then** the removed rows are highlighted in
   the Before view.
4. **Given** a preview, **when** it completes, **then** a summary states the effect on the full
   dataset, such as rows removed, values changed, and columns added, removed, or renamed.
5. **Given** the step list changes after a preview, **when** the user views the preview, **then**
   it is marked out of date until the user previews again.
6. **Given** a preview that fails, **when** the error is reported, **then** the message names the
   step that failed and the step list remains editable.

---

### User Story 3 - Manage Steps in the List (Priority: P2)

As a data analyst, I want to enable, disable, edit, reorder, duplicate, and delete steps so that
I can refine my cleaning plan without rebuilding it.

**Why this priority**: Refining a plan is common but the feature still delivers value with add,
preview, and apply alone.

**Independent Test**: Create three steps, disable one, move one up, edit another, delete one, and
verify the list order, numbering, and preview reflect each change.

**Acceptance Scenarios**:

1. **Given** a step, **when** the user switches its toggle off, **then** the step stays in the
   list but is skipped by preview and apply, and the Apply button counts only enabled steps.
2. **Given** a step, **when** the user chooses Edit from its menu, **then** the step form opens
   pre-filled and saving it updates the step in place.
3. **Given** a step, **when** the user chooses Move up, Move down, Duplicate, or Delete from its
   menu, **then** the list updates and the steps are renumbered in their new order.
4. **Given** the step list, **when** the user operates it with the keyboard only, **then** every
   step action, including the toggle and menu, is reachable and announced.

---

### User Story 4 - Fill, Replace, and Convert Values (Priority: P1)

As a data analyst, I want to fill missing values, replace specific values, and convert column
types so that columns contain consistent, usable values.

**Why this priority**: Missing-value handling and type conversion are MVP requirements.

**Independent Test**: Fill missing values in a numeric column with the median, replace "N/A"
with an empty value in a text column, and convert a text column of whole numbers to integers.

**Acceptance Scenarios**:

1. **Given** the Fill form, **when** the user selects a column and a strategy, **then** the
   choices are a fixed value, average, median, most frequent value, previous value, and next
   value, with average and median offered only for numeric columns.
2. **Given** the Replace form, **when** the user selects one or more columns and enters a value
   to find and a replacement, **then** the step replaces whole-cell matches, with an option to
   match text inside cells and an option for case sensitivity.
3. **Given** the Replace form, **when** the user chooses to replace with a missing value,
   **then** matching cells become missing.
4. **Given** the Convert form, **when** the user selects a column and a target type of text,
   whole number, decimal number, true/false, or date, **then** the step converts the column.
5. **Given** a conversion with values that cannot be converted, **when** the user previews or
   applies it, **then** the user chooses in the form whether such values fail the step with a
   count of affected values or become missing.

---

### User Story 5 - Remove, Rename, Split, and Merge (Priority: P2)

As a data analyst, I want to remove duplicates, rows with missing values, or columns, rename
columns, split a column into several, and merge several columns into one so that the dataset has
the shape I need.

**Why this priority**: These complete the Clean ribbon after the value-level operations.

**Independent Test**: Remove duplicate rows by a key column, drop a column, rename a column,
split "full_name" on a space into two columns, and merge "city" and "country" with ", ".

**Acceptance Scenarios**:

1. **Given** the Remove form, **when** the user chooses duplicate rows, **then** the user can
   compare all columns or selected columns and the step keeps the first occurrence.
2. **Given** the Remove form, **when** the user chooses rows with missing values, **then** the
   user can consider any column or selected columns.
3. **Given** the Remove form, **when** the user chooses columns, **then** the user selects the
   columns to remove and at least one column must remain.
4. **Given** the Rename form, **when** the user enters new names for one or more columns,
   **then** blank or duplicate final names are rejected before the step is added.
5. **Given** the Split form, **when** the user selects a text column, a separator, and new
   column names, **then** the step creates one column per name in order, fills missing parts
   with missing values, keeps any extra text in the last column, and optionally removes the
   original column.
6. **Given** the Merge form, **when** the user selects two or more columns in order, a separator,
   and a new column name, **then** the step creates the merged text column, treats missing
   values as empty text, and optionally removes the source columns.

### Edge Cases

- A step may refer to a column that an earlier step renames or removes; validation evaluates
  each step against the columns produced by the steps before it and flags the conflict.
- Disabling all steps leaves nothing to preview or apply; those actions are unavailable.
- Applying steps that remove every row produces an empty dataset with its columns intact and
  a clear empty-result state, not an error.
- Split or merge output names that clash with existing columns are rejected.
- Average and median fill on a column with no values, and most-frequent fill on a column with
  only missing values, are rejected with an actionable message.
- Leaving the Clean tab keeps the draft step list; each open file keeps its own draft, and
  closing a file discards its draft.
- Undo or redo while draft steps exist keeps the draft and revalidates it against the new
  current dataset.
- Apply runs as a background operation that can be cancelled; cancelling leaves the dataset
  unchanged and keeps the draft steps.
- Large datasets keep previews bounded to a sample, while summary counts describe the full
  dataset.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Clean tab MUST show a draft list of cleaning steps for the current dataset with
  each step's position, title, settings summary, enabled toggle, and an actions menu.
- **FR-002**: Users MUST be able to add steps from an Add step menu and from the Clean ribbon
  commands Convert, Replace, Fill, Split, Merge, Remove, and Rename.
- **FR-003**: Each step type MUST be configured through a guided form with column pickers,
  labelled choices, and inline validation; users MUST NOT need to enter code or JSON.
- **FR-004**: The system MUST support these step types: fill missing values; replace values;
  convert type; split column; merge columns; remove duplicate rows; remove rows with missing
  values; remove columns; and rename columns.
- **FR-005**: Users MUST be able to enable, disable, edit, move up, move down, duplicate, and
  delete steps; step numbers MUST follow the list order.
- **FR-006**: The system MUST validate each step against the columns produced by the preceding
  enabled steps and MUST show which step is invalid and why.
- **FR-007**: Preview MUST show a bounded sample of rows before and after the enabled steps in
  table form, highlighting missing, changed, and removed values.
- **FR-008**: Preview MUST report a full-dataset summary of rows removed, values changed, and
  columns added, removed, or renamed.
- **FR-009**: Preview MUST be marked out of date whenever the step list changes after it ran.
- **FR-010**: Apply MUST run all enabled steps in order on the full dataset as one background
  operation that shows progress and can be cancelled, and MUST label the number of steps it
  will apply.
- **FR-011**: A successful Apply MUST create one entry in the workspace change history so that
  a single Undo reverts it and Redo restores it, and MUST mark the workspace as unsaved.
- **FR-012**: A failed or cancelled Apply MUST leave the dataset unchanged and keep the draft
  steps with the failure explained.
- **FR-013**: Cancel MUST discard the draft steps after confirmation without changing the
  dataset.
- **FR-014**: The source file MUST NOT be modified by preview or apply; changes reach the file
  only through the existing Save or Export actions.
- **FR-015**: Step settings MUST be treated as data and MUST NOT execute user-provided code or
  expressions.
- **FR-016**: The Clean tab MUST show the number of configured steps and state that changes
  apply to a new version of the data while the original file stays unchanged.
- **FR-017**: The Clean tab, step forms, and step list MUST be keyboard accessible, expose
  meaningful labels and states to assistive technology, and remain usable at supported desktop
  window sizes, stacking the step list above the preview on narrow windows.
- **FR-018**: The interface MUST receive only bounded preview rows, summaries, and metadata, not
  the full dataset.

### Key Entities

- **Cleaning Step**: One configured operation with a type, settings, enabled state, and
  position in the draft.
- **Step Draft**: The ordered list of cleaning steps for the current dataset that has not yet
  been applied.
- **Step Validation Result**: For each step, whether it is valid against the columns available
  at its position, and the reason when it is not.
- **Cleaning Preview**: A bounded before and after sample with per-cell change markers and
  removed-row markers.
- **Change Summary**: Full-dataset counts of rows removed, values changed, and column changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of representative first-time users can add, preview, and apply a
  fill-missing-values step and a remove-duplicates step without assistance.
- **SC-002**: Users can configure any single supported step in under 1 minute.
- **SC-003**: For supported step configurations, at least 95% of valid cases produce results
  that match a reference result.
- **SC-004**: At least 95% of invalid step configurations are reported on the specific step
  before or during preview, without changing the dataset.
- **SC-005**: A preview of a representative dataset appears within 3 seconds for up to
  10 enabled steps.
- **SC-006**: Applying steps on a representative large dataset shows a running state within
  1 second, and the interface stays responsive until it finishes.
- **SC-007**: One Undo after Apply restores the previous dataset in 100% of tested cases.
- **SC-008**: Accessibility and responsive checks find no blocking keyboard or layout failures
  in the Clean tab at supported window sizes.

## Assumptions

- The feature builds on the 002 Data-tab work: Save, Undo, Redo, the change history, and the
  background job model are reused rather than replaced.
- "Remove" in the ribbon covers duplicate rows, rows with missing values, and columns; filtering
  by conditions stays in the Data tab.
- Steps are a draft for the current dataset only; saving, naming, and reusing step lists is part
  of the later Pipelines feature.
- The preview sample is the first rows of the current dataset, consistent with the existing
  bounded preview.
- Duplicate removal keeps the first occurrence of each duplicate group.
- Date conversion recognizes standard ISO-style dates; custom date formats are out of scope.
- Replace matches literal values only; pattern matching is out of scope.
- The history dropdown shown in the design mockup is covered by the existing workspace history
  and is not re-implemented here.
- Outlier handling, text case or whitespace normalization, and calculated columns are outside
  this feature.
