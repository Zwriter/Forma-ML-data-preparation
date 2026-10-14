# Feature Specification: Forma MVP Data Preparation Workflow

**Feature Branch**: `001-forma-mvp`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "Use the project description in README.md and the basic requirements in REQUIREMENTS.md to create the initial Forma MVP specification."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import and Inspect a Dataset (Priority: P1)

As a data scientist, I want to open a CSV or Parquet dataset and inspect its structure so
that I can understand the data before changing it.

**Why this priority**: Dataset inspection is the entry point for every Forma workflow and
provides value even when no cleaning is performed.

**Independent Test**: Open a valid supported file and verify that its schema, row count when
available, column count, column names, and data types are presented without modifying the
source file.

**Acceptance Scenarios**:

1. **Given** a valid CSV or Parquet file, **When** the user selects it, **Then** Forma opens
   the dataset and displays its available schema information.
2. **Given** an unsupported or invalid file, **When** the user selects it, **Then** Forma
   displays an actionable error and leaves the file unchanged.
3. **Given** a dataset larger than available frontend display capacity, **When** the user
   views its records, **Then** Forma displays bounded pages or batches rather than loading
   the entire dataset into the interface.

---

### User Story 2 - Profile and Clean Data (Priority: P1)

As a data analyst, I want to identify common data-quality problems and apply basic cleaning
operations so that I can prepare a trustworthy dataset without writing repetitive scripts.

**Why this priority**: Profiling and cleaning are the core value of Forma and directly address
missing values, duplicates, inconsistent types, and unwanted columns or rows.

**Independent Test**: Open a representative dataset, inspect its quality statistics, apply at
least one supported cleaning operation, and verify that the resulting preview reflects the
selected operation while the original remains unchanged.

**Acceptance Scenarios**:

1. **Given** an open dataset, **When** the user requests profiling, **Then** Forma displays
   row and column counts, missing-value counts, data types, distinct-value counts, numerical
   summaries, and categorical frequencies where applicable.
2. **Given** a dataset containing duplicate records, **When** the user chooses duplicate
   removal, **Then** the preview and resulting dataset contain no records considered
   duplicates under the selected operation.
3. **Given** columns containing missing values, **When** the user chooses to remove affected
   rows or fill values, **Then** Forma applies the selected operation and reports its result.
4. **Given** a column operation or type conversion with invalid parameters, **When** the user
   attempts to apply it, **Then** Forma explains the validation problem and does not produce a
   misleading successful result.
5. **Given** a long-running profile or cleaning operation, **When** it is running, **Then**
   the interface remains usable and shows its running, completed, failed, or cancelled state.

---

### User Story 3 - Preview and Export Cleaned Data (Priority: P1)

As an ML engineer, I want to compare the cleaned result with the source preview and export
it as CSV or Parquet so that I can use it in downstream analysis and model preparation.

**Why this priority**: Export completes the primary import-clean-export workflow and makes the
cleaned result useful outside Forma.

**Independent Test**: Apply a deterministic cleaning operation, compare before and after
previews, export the result to each supported format, and reopen the exported files.

**Acceptance Scenarios**:

1. **Given** an open dataset with configured cleaning operations, **When** the user requests a
   comparison, **Then** Forma shows the relevant before and after previews and the operations
   applied.
2. **Given** a valid cleaned dataset, **When** the user selects CSV or Parquet and an output
   location, **Then** Forma writes the result there and reports completion.
3. **Given** an output location that cannot be written or an interrupted export, **When** the
   export fails, **Then** Forma reports the failure and does not present an incomplete output
   as a completed dataset.
4. **Given** an imported source file, **When** the user exports a cleaned result without
   explicitly choosing the source path, **Then** the source file remains unchanged.

### Edge Cases

- A dataset may have zero rows, zero columns, or only missing values; Forma MUST show a clear
  state and avoid reporting fabricated statistics.
- A file may be valid but have an empty, duplicated, or otherwise invalid column name; Forma
  MUST explain the issue before a transformation depends on that schema.
- A dataset may be too large or expensive for an immediate statistic; Forma MUST show an
  indeterminate or pending state rather than inventing progress.
- A type conversion may fail for only some values; Forma MUST identify the failed operation and
  preserve the last valid dataset state.
- A row filter may reference an unknown column, malformed expression, unsupported operator, or
  executable code; Forma MUST reject it before evaluation and MUST never execute user-provided
  code.
- An export may target an existing file; Forma MUST require explicit confirmation before
  replacing it.
- A user may cancel a running operation; Forma MUST report cancellation and keep the source
  dataset available.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to select and open CSV and Parquet files from the local
  filesystem.
- **FR-002**: Forma MUST validate the selected file before treating it as an open dataset.
- **FR-003**: Forma MUST preserve the original source file by default.
- **FR-004**: Forma MUST display available row and column counts, column names, and data types.
- **FR-005**: Forma MUST provide bounded record previews so the interface does not require the
  complete dataset at once.
- **FR-006**: Users MUST be able to request missing-value statistics, distinct-value counts,
  numerical summaries, and categorical frequencies when applicable.
- **FR-007**: Users MUST be able to remove duplicate records.
- **FR-008**: Users MUST be able to drop rows with missing values and fill missing values using
  one of the supported strategies `constant`, `mean`, `median`, or `mode`; `constant` MUST
  require a replacement value, `mean` and `median` MUST require a numeric column, and `mode`
  MUST support any column with at least one non-missing value.
- **FR-009**: Users MUST be able to rename columns, drop columns, convert data types, and
  filter rows using validated parameters. Row filters MUST use a declarative expression made
  only of column references, literal values, comparison operators (`==`, `!=`, `<`, `<=`, `>`,
  `>=`), null checks, parentheses, and boolean `AND`/`OR`; filters MUST NOT execute arbitrary
  code.
- **FR-010**: Forma MUST show a before and after preview for configured cleaning operations.
- **FR-011**: Forma MUST report operation states as pending, running, completed, failed, or
  cancelled, and MUST keep the interface responsive while work is running.
- **FR-012**: Forma MUST provide understandable error messages that identify the failed action
  and, when possible, a corrective next step.
- **FR-013**: Users MUST be able to export a cleaned dataset as CSV or Parquet to a selected
  local destination.
- **FR-014**: Forma MUST use safe output behavior so failed or interrupted exports are not
  presented as completed outputs.
- **FR-015**: Forma MUST require explicit confirmation before replacing an existing output file.
- **FR-016**: Forma MUST keep processing local and MUST NOT require a cloud account, hosted
  backend, Docker, or dataset upload.
- **FR-017**: Forma MUST expose only bounded previews, metadata, and aggregates to the user
  interface; complete multi-gigabyte datasets MUST remain in the processing layer.
- **FR-018**: Forma MUST reject row-filter expressions that contain unknown columns, malformed
  syntax, unsupported operators, or executable code before evaluating them.

### Key Entities

- **Dataset Reference**: A local dataset selected by the user, including its source location,
  format, schema metadata, and availability state.
- **Dataset Preview**: A bounded view of records and column metadata used for inspection and
  before-and-after comparison.
- **Profile Report**: Data-quality statistics associated with a dataset, including missing,
  distinct, numerical, and categorical measures where applicable.
- **Transformation**: A validated, user-configured cleaning action such as deduplication,
  missing-value handling, column operation, type conversion, or row filtering.
- **Processing Job**: A tracked operation with a state, optional progress, result, and
  understandable failure or cancellation information.
- **Export Result**: A cleaned dataset written to a user-selected CSV or Parquet destination.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can complete the happy-path import, inspect, clean, preview, and export
  workflow for a representative dataset without editing code.
- **SC-002**: A valid CSV or Parquet dataset of at least 1 GB can be opened and previewed
  without transferring the complete dataset into the user interface.
- **SC-003**: At least 95% of supported invalid-file and invalid-transformation test cases
  produce an actionable error and preserve the last valid dataset state.
- **SC-004**: At least 95% of supported export test cases produce a readable CSV or Parquet
  output whose records and schema match the configured result.
- **SC-005**: Users see a visible operation state within 1 second of starting a long-running
  profile, cleaning, or export operation, and the interface remains interactive while it runs.
- **SC-006**: At least 90% of representative first-time users can complete the primary
  import-clean-export task without assistance.
- **SC-007**: Source-file integrity checks show that the original input remains byte-for-byte
  unchanged after a standard cleaning and export workflow.
- **SC-008**: A reviewer can identify the active transformations, their order, and the output
  destination from the workflow state without inspecting application internals.

## Assumptions

- The initial release targets a single local user and one supported desktop operating system.
- CSV and Parquet are the only required import and export formats for the MVP.
- A row count may be unavailable or expensive for some datasets; the interface may show an
  explicit unknown or pending state.
- Profiling statistics that are expensive to compute may run as background operations.
- The MVP does not include model training, database administration, cloud synchronization,
  collaboration, AI-generated transformations, or advanced visual pipeline editing.
- Users have permission to read source files and write to their chosen export locations.
- Saved reusable pipelines and ML-specific preprocessing are planned follow-up capabilities,
  not prerequisites for the initial import-clean-export workflow.
