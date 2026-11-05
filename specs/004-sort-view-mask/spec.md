# Feature Specification: Sort as a Persistent View Mask

**Feature Branch**: `004-sort-view-mask`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Fill with previous doesn't work since filtering and sort modify the
file. Sorting should act like a mask whose state persists even if the app is closed; it still
appears as a modification that can be undone and saved or not saved. Keep only sorting in the
mask: filters and row drops stay real changes that are saved. Clean steps work on all rows.
Remember the mask in the app data folder. Make save as copy the default."

## Clarifications

### Session 2026-11-04

- Q: What does Save write when a sort is active? → A: The mask is only a view. Saving writes
  the rows in their stored order; filters, removed rows, and Clean changes are saved. The sort
  is remembered separately.
- Q: Which parts of the Data tab become a mask? → A: Only Sort. Filter, Group by, Pivot, and
  Unpivot keep changing the data.
- Q: Which rows do Clean steps change while a sort is active? → A: All rows, in stored order.
- Q: Where is the mask remembered? → A: In Forma's app data folder, per file, never beside the
  user's data.
- Q: Default save behavior? → A: Save a copy (done in feature 003 follow-up, 2026-11-04).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sort the View Without Reordering the Data (Priority: P1)

As a data analyst, I want sorting to change only how rows are shown so that order-dependent
cleaning, such as filling a missing value from the previous row, uses the file's real order.

**Why this priority**: Today a sort silently reorders the data, which breaks "Fill with previous
value" and "next value" and changes the saved file's row order.

**Independent Test**: Open a file, sort by a column, add a "Fill with previous value" step, and
apply it; each missing cell gets the value of the row above it in the file, not in the sorted
view, while the worksheet still shows the sorted order.

**Acceptance Scenarios**:

1. **Given** an open dataset, **When** the user sorts by one or more columns, **Then** the Data
   and Clean worksheets show rows in that order, and paging, search, and column selection work
   over the sorted view.
2. **Given** an active sort, **When** a Clean step that depends on row order runs (fill previous
   or next), **Then** it uses the stored row order, and the worksheet shows the result in the
   sorted view with change markers on the right cells.
3. **Given** an active sort, **When** the user filters rows, removes duplicates, or applies any
   other data change, **Then** the change applies to the data and the sort keeps applying to the
   result.
4. **Given** an active sort, **When** the user saves or exports, **Then** the file is written in
   stored row order, including every data change, and the source file stays unchanged when
   saving a copy.

---

### User Story 2 - Undo, Redo, and Save the Sort (Priority: P1)

As a data analyst, I want a sort change to behave like any other change so that I can undo it and
decide whether to keep it.

**Why this priority**: The user asked for the sort to stay a modification that can be undone and
saved or discarded.

**Independent Test**: Sort, undo, redo, then close with and without saving, and reopen the file.

**Acceptance Scenarios**:

1. **Given** an open dataset, **When** the user sorts, **Then** the change appears in undo
   history and the file shows unsaved changes.
2. **Given** a sort in history, **When** the user undoes or redoes, **Then** the view returns to
   the previous or next sort without changing the data.
3. **Given** only the sort changed since the last save, **When** the user saves, **Then** the
   sort is remembered and the data file is not rewritten.
4. **Given** an unsaved sort change, **When** the user closes and chooses not to save, **Then**
   the next time the file opens it shows the sort that was last saved.
5. **Given** the user clears the sort, **When** the change is saved, **Then** the file reopens
   in stored order.

---

### User Story 3 - Reopen With the Saved Sort (Priority: P2)

As a data analyst, I want a file to reopen with the sort I saved so that I can continue where I
left off, even after closing the app.

**Why this priority**: Persistence is what makes the mask useful across sessions; it builds on
User Stories 1 and 2.

**Independent Test**: Save a sorted file, quit the app, reopen the file, and confirm the sort is
active and undo history starts clean.

**Acceptance Scenarios**:

1. **Given** a saved sort for a file, **When** the file is opened, **Then** the worksheet shows
   that sort, the file shows no unsaved changes, and the sort is not an undoable step.
2. **Given** a saved sort that names a column the file no longer has, **When** the file opens,
   **Then** that sort key is dropped, the remaining keys apply, and the user is told once.
3. **Given** the user saves a copy, **When** either the copy or the source file is opened later,
   **Then** both open with the saved sort.

---

### User Story 4 - See and Clear the Active Sort (Priority: P2)

As a data analyst, I want to see which columns the view is sorted by and clear the sort in one
step so that I always know why rows appear in a given order.

**Why this priority**: A view that hides its own order is confusing; this completes the mask.

**Independent Test**: Sort by two columns, check the header indicators and their priority, then
clear the sort.

**Acceptance Scenarios**:

1. **Given** an active sort, **When** the worksheet is shown, **Then** each sorted column header
   shows its direction and priority in text and an icon, not colour alone.
2. **Given** an active sort, **When** the user opens Sort, **Then** the dialog starts from the
   current keys and offers Clear sort.
3. **Given** a Clean step renames or removes a sorted column, **When** the step is applied,
   **Then** a renamed key follows the new name and a removed key is dropped.

### Edge Cases

- Group by, Pivot, and Unpivot produce a new shape; the sort is cleared for their result, and
  undo restores the earlier data and sort.
- Sorting by a column that holds missing values keeps the chosen "missing first/last" placement.
- Rows with equal sort values keep their stored order.
- Search and column selection combine with the sort; hiding a sorted column keeps the sort.
- A saved sort for a file that no longer exists is ignored; stored masks never block opening.
- Two open tabs of different files keep separate sorts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sorting MUST change only the order rows are shown in; the stored data and its row
  order MUST stay unchanged.
- **FR-002**: The Data and Clean worksheets MUST page, search, and project columns over the
  sorted view, and Clean change markers MUST point at the correct displayed cells.
- **FR-003**: Clean steps MUST run on all rows in stored order regardless of the active sort.
- **FR-004**: Filter, row and column removal, and Clean steps MUST keep changing the data and
  MUST keep the active sort applied to their result.
- **FR-005**: Group by, Pivot, and Unpivot MUST clear the sort for their result.
- **FR-006**: A sort change MUST be an undoable history step that marks the file as having
  unsaved changes; undo and redo MUST restore the previous view without touching the data.
- **FR-007**: Save and Export MUST write rows in stored order with all data changes applied.
- **FR-008**: Saving MUST remember the current sort for the saved file; when saving a copy it MUST
  also be remembered for the source file.
- **FR-009**: If only the sort changed since the last save, Save MUST remember the sort without
  rewriting the data file.
- **FR-010**: Opening a file MUST restore its remembered sort as the clean, saved state, dropping
  keys for columns that no longer exist and telling the user.
- **FR-011**: Remembered sorts MUST be stored in Forma's app data folder per file path and MUST
  survive closing the app; nothing is written beside the user's files.
- **FR-012**: Sorted column headers MUST show direction and priority without relying on colour.
- **FR-013**: The Sort dialog MUST start from the active keys and MUST offer Clear sort.
- **FR-014**: A Clean step that renames a sorted column MUST carry the key to the new name; one
  that removes it MUST drop the key.
- **FR-015**: The engine MUST validate sort keys at the IPC boundary (known columns, direction,
  missing-value placement) and MUST keep transferring only bounded preview pages.

### Key Entities

- **Sort Mask**: Ordered sort keys (column, ascending or descending, missing first or last) that
  decide display order only.
- **Working State**: One undo history entry: the data plus the sort mask that applies to it.
- **Remembered Mask**: The sort mask last saved for a file path, kept in app data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After sorting, "Fill with previous value" fills every missing cell from the row
  above it in stored order in 100% of the acceptance fixture cases.
- **SC-002**: Saving a sorted dataset leaves the row order of the written file identical to the
  stored order in 100% of tests.
- **SC-003**: A saved sort is restored on reopen after an app restart in 100% of tests, with no
  unsaved-changes marker.
- **SC-004**: Changing or undoing a sort updates the visible page within the same time as a
  normal page change on a 1-million-row dataset (target under 1 second).
- **SC-005**: Saving when only the sort changed writes no data file.

## Assumptions

- Export follows Save: rows are written in stored order. A sorted export can be added later.
- Remembered sorts use the existing app settings storage, which lives in Forma's app data folder
  in the desktop app.
- The remembered sort for a source file is updated when a copy is saved, because the user keeps
  working on that file's view.
- Closing without saving discards sort changes since the last save, like any other change.
- Existing undo history entries are not migrated; the change applies to newly opened files.
