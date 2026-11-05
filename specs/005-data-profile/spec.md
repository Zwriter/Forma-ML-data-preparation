# Feature Specification: Data Profile Dashboard

**Feature Branch**: `005-data-profile`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Write the spec for the functionality of the profile tab. The image
attached is how I would like it to look." The mockup shows a "Data profile" page with a header
(title, subtitle, last-updated time, refresh, Generate report), four summary cards (Rows,
Columns, Missing cells, Duplicate rows), four panels (Data quality ring, Missing values by
column, Distribution of a numeric column with summary statistics, Categorical column bar chart),
and a searchable, filterable Columns table (#, name, type, completeness bar, unique values,
quality badge, missing, examples, row menu).

## Clarifications

### Session 2026-11-05

- Q: What counts as Invalid? → A: A value that is present but does not fit the column's detected
  type, such as text in a column where at least 95% of values are numbers. Custom validation
  rules are out of scope for now.
- Q: What can users do with invalid data? → A: Export it separately, with a new column stating
  the reject reason.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the Health of a Dataset at a Glance (Priority: P1)

As a data analyst, I want the Profile tab to show the size and overall quality of my dataset
on one screen so that I know within seconds whether the data needs cleaning.

**Why this priority**: Today the Profile tab shows a raw technical dump that users cannot read.
A readable overview is the core value of the tab and is useful on its own.

**Independent Test**: Open a dataset, go to the Profile tab, and verify the header, the four
summary cards, and the data quality panel show values that match the dataset.

**Acceptance Scenarios**:

1. **Given** an open dataset with no profile yet, **When** the user opens the Profile tab,
   **Then** profiling starts automatically, a progress state with a Cancel action is shown, and
   the rest of the app stays usable.
2. **Given** profiling has finished, **When** the dashboard appears, **Then** the header shows
   the title "Data profile", a one-line subtitle, the time the profile was computed ("Last
   updated Today 10:24 AM" style), a Refresh action, and a Generate report action.
3. **Given** a finished profile, **When** the user reads the summary cards, **Then** they show
   total Rows, total Columns, total Missing cells, and Duplicate rows, each with an icon, with
   numbers grouped by thousands (e.g. 7,043); Missing cells and Duplicate rows use a warning or
   alert accent when greater than zero and a neutral accent when zero.
4. **Given** a finished profile, **When** the user reads the Data quality panel, **Then** a ring
   chart shows the share of Valid, Missing, and Invalid cells with the overall completeness
   percentage in the centre (one decimal, e.g. "96.8% Complete") and a legend listing each
   share as a percentage and a cell count, e.g. "Missing 3.2% (3,218)".
5. **Given** profiling is running, **When** the user selects Cancel, **Then** profiling stops,
   any previous profile stays visible (marked out of date), or an empty state with a "Profile
   dataset" action is shown if there was none.

---

### User Story 2 - Review Every Column in a Table (Priority: P1)

As a data analyst, I want a table with one row per column showing its type, completeness,
unique values, quality, missing count, and example values so that I can find problem columns
quickly, even in wide datasets.

**Why this priority**: The column table is where users decide what to clean; without it the
overview cannot be acted on.

**Independent Test**: Profile a dataset with mixed column types and missing values, then search,
filter, and sort the Columns table and verify the visible rows and counts are correct.

**Acceptance Scenarios**:

1. **Given** a finished profile, **When** the user views the Columns table, **Then** each column
   shows: position (#), name, type with a type badge (text, integer, decimal, date/time,
   boolean, other), completeness as a percentage with a horizontal bar, unique value count,
   a quality badge, missing count with percentage, and up to three example values.
2. **Given** the Columns table, **When** the user types in "Search columns…", **Then** only
   columns whose name contains the text (case-insensitive) are shown and the count label
   updates (e.g. "3 of 21 columns").
3. **Given** the Columns table, **When** the user picks a value in the "All types" or "All
   quality" filter, **Then** only matching columns are shown; search and both filters combine.
4. **Given** the Columns table, **When** the user selects a sortable header (#, Column name,
   Type, Completeness, Unique values, Quality, Missing), **Then** rows sort by that header,
   selecting it again reverses the order, and an arrow shows the active sort and direction.
5. **Given** the Columns table, **When** the user opens the settings (gear) control, **Then**
   they can show or hide optional table columns (Type, Completeness, Unique values, Quality,
   Missing, Examples); # and Column name are always shown, and the choice is remembered.
6. **Given** a column row, **When** the user opens its row menu (…), **Then** they can choose
   "Show distribution" (loads that column into the matching chart panel), "Clean this column"
   (opens the Clean tab with that column selected), "Export invalid rows" (see User Story 4),
   and "Copy column name".
7. **Given** a search or filter that matches nothing, **When** the table is empty, **Then** a
   "No columns match" message with a "Clear filters" action is shown.

---

### User Story 3 - Understand Missing Values and Distributions (Priority: P2)

As a data analyst, I want charts of missing values per column, the distribution of a numeric
column, and the frequencies of a categorical column so that I can spot gaps, skew, outliers,
and imbalanced categories without writing queries.

**Why this priority**: Charts make patterns obvious, but the summary cards and column table
already deliver the essential information.

**Independent Test**: Profile a dataset with numeric and categorical columns and verify each
chart's bars, labels, and statistics against values computed independently.

**Acceptance Scenarios**:

1. **Given** a finished profile, **When** the user views "Missing values by column", **Then** a
   horizontal bar chart lists up to 10 columns with the most missing values, highest first,
   each labelled with count and percentage, e.g. "1,521 (21.6%)"; if more columns have missing
   values a "Show all" action lists them; if none do, the panel says "No missing values".
2. **Given** a dataset with at least one numeric column, **When** the user views the
   Distribution panel, **Then** it shows a histogram of one numeric column with labelled axes
   (value and Count) and a statistics row with Mean, Median, Std. dev., Min, and Max.
3. **Given** a dataset with at least one categorical column, **When** the user views the
   categorical panel, **Then** it shows a vertical bar chart of the most frequent values of one
   column, each bar labelled with count and percentage, e.g. "3,875 (55.0%)".
4. **Given** the Distribution or categorical panel, **When** the user picks another column from
   the panel's column selector, or chooses "Show distribution" in a table row menu, **Then** the
   panel updates to that column and its title names it, e.g. "Distribution of MonthlyCharges"
   or "Contract (categorical)".
5. **Given** any chart, **When** the user hovers or focuses a bar or ring segment, **Then** a
   tooltip shows its exact label, count, and percentage.
6. **Given** a dataset with no numeric (or no categorical) columns, **When** the dashboard is
   shown, **Then** the corresponding panel shows a short explanation instead of an empty chart.

---

### User Story 4 - Export Invalid Rows with a Reject Reason (Priority: P2)

As a data analyst, I want to export the rows that contain invalid values to a separate file,
with a column explaining why each row was rejected, so that I can send them back to the data
owner or fix them outside Forma without touching my main dataset.

**Why this priority**: Invalid values are found by the profile, but users cannot act on them
without seeing the offending rows and the reason; the dashboard alone already shows counts.

**Independent Test**: Profile a dataset where a mostly numeric text column contains a few
non-numeric values, export invalid rows, and open the file to verify it holds exactly those
rows, all original columns, and a reject reason per row; the source file is unchanged.

**Acceptance Scenarios**:

1. **Given** a current profile with at least one invalid cell, **When** the user selects "Export
   invalid rows" in the Data quality panel, **Then** a save dialog opens with a default name
   based on the dataset name plus "_rejected" and the date, and a format choice matching the
   app's existing export formats.
2. **Given** the user confirms the save, **When** the export finishes, **Then** the file
   contains every row that has at least one invalid cell, in stored row order, with all original
   columns and values unchanged, plus one added column `reject_reason`.
3. **Given** a row with one invalid cell, **When** it is exported, **Then** its reject reason
   names the column, the value, and the expected type, e.g. `MonthlyCharges: "abc" is not a
   decimal number`; **Given** a row with several invalid cells, **Then** all reasons are listed
   in column order, separated by "; ".
4. **Given** a column row in the Columns table with invalid values, **When** the user chooses
   "Export invalid rows" from its row menu, **Then** only rows invalid in that column are
   exported, and the reject reason mentions only that column.
5. **Given** a profile with zero invalid cells, or an out-of-date profile, **When** the user
   looks at "Export invalid rows", **Then** the action is disabled with a hint ("No invalid
   values" or "Refresh the profile first").
6. **Given** an export of a large dataset, **When** it runs, **Then** it runs in the background
   with progress and Cancel, and a cancelled export leaves no partial file behind.
7. **Given** the export finished, **When** the user returns to the dataset, **Then** the working
   data, its undo history, and the source file are unchanged, and a confirmation names the file
   and the number of rows exported.

---

### User Story 5 - Keep the Profile Current (Priority: P2)

As a data analyst, I want to know when the profile no longer matches my data and refresh it in
one click so that I never make decisions from stale numbers.

**Why this priority**: Users switch between Data, Clean, and Profile; a silently stale profile
leads to wrong conclusions.

**Independent Test**: Profile a dataset, apply a Clean step, return to the Profile tab, and
verify the out-of-date notice appears and Refresh produces updated numbers.

**Acceptance Scenarios**:

1. **Given** a finished profile, **When** the data changes (Clean step applied, rows filtered or
   removed, undo, redo, or another file opened), **Then** the dashboard shows an "Out of date"
   notice next to the last-updated time while keeping the old numbers visible.
2. **Given** an out-of-date profile, **When** the user selects Refresh (header or ribbon),
   **Then** profiling runs again on the current data and the dashboard updates when done.
3. **Given** only the sort order changed, **When** the user returns to the Profile tab, **Then**
   the profile is not marked out of date, because sorting does not change the data.
4. **Given** a profile for the current data state, **When** the user leaves and returns to the
   Profile tab during the same session, **Then** the existing profile is shown without
   recomputing.

---

### User Story 6 - Generate a Shareable Profile Report (Priority: P3)

As a data analyst, I want to save the profile as a report file so that I can share the data
quality findings with colleagues who do not use Forma.

**Why this priority**: Valuable for collaboration but not needed to understand or clean data.

**Independent Test**: Profile a dataset, select Generate report, save the file, and open it
outside Forma to verify it contains the same figures as the dashboard.

**Acceptance Scenarios**:

1. **Given** a finished profile, **When** the user selects Generate report, **Then** a save
   dialog opens with a default name based on the dataset name and date, and the report is
   written to the chosen location.
2. **Given** a saved report, **When** it is opened in a standard web browser without Forma or a
   network connection, **Then** it shows the dataset name, profile time, summary cards, data
   quality breakdown, missing-values chart, the selected distribution and categorical charts,
   and the full Columns table.
3. **Given** no finished profile, or an out-of-date one, **When** the user looks at Generate
   report, **Then** it is disabled with a hint to profile or refresh first.
4. **Given** writing the report fails (no permission, disk full), **When** the error occurs,
   **Then** an actionable message names the cause and the dashboard is unchanged.

---

### Edge Cases

- **Empty dataset** (columns but zero rows): cards show 0 rows, completeness shows "—" instead
  of a percentage, charts show "No rows to profile", and the Columns table still lists columns.
- **Very wide dataset** (hundreds of columns): the Columns table scrolls inside its panel with
  a sticky header; search and filters stay responsive.
- **Very large dataset** (millions of rows): profiling runs in the background with progress and
  Cancel; only bounded summaries reach the screen, never full columns.
- **Column that is entirely missing**: completeness 0.0%, quality "Poor", examples "—", and it
  is excluded from distribution selectors.
- **Constant column** (one unique value): histogram shows a single bar; Std. dev. shows 0.
- **High-cardinality text column** (e.g. IDs): categorical panel shows the top values plus an
  "Other" bar summing the rest, and notes that values are mostly unique.
- **Long column names or values**: truncated with an ellipsis and shown in full on hover/focus.
- **Profiling fails**: an actionable error is shown with a "Try again" action; the previous
  profile, if any, stays visible and marked out of date.
- **No dataset open**: the Profile tab shows an empty state pointing the user to open a file.
- **Dataset with a sort active**: profile values are identical to the unsorted data, and
  exported invalid rows are written in stored row order.
- **Dataset already has a `reject_reason` column**: the added column is named
  `reject_reason_1` (or the next free number) so no original column is overwritten.
- **Invalid-rows export target is the source file**: the export refuses to overwrite the open
  source file and asks for another name.
- **Invalid-rows export fails** (no permission, disk full): an actionable message names the
  cause, no partial file is left, and the dataset is unchanged.

## Requirements *(mandatory)*

### Functional Requirements

**Running and freshness**

- **FR-001**: The Profile tab MUST start profiling automatically when opened for a dataset that
  has no profile for its current data state.
- **FR-002**: Profiling MUST run in the background, show progress, offer Cancel, and never block
  navigation or other tabs.
- **FR-003**: The profile MUST describe all rows of the current working data, including unsaved
  Clean and Data changes, and MUST ignore the sort view mask.
- **FR-004**: The dashboard MUST show when the profile was computed and MUST mark it "Out of
  date" whenever the working data changes after that time.
- **FR-005**: Users MUST be able to re-run profiling from a Refresh action in the header and the
  ribbon's Refresh command.
- **FR-006**: The last finished profile for the current data state MUST be reused when the user
  returns to the tab within the same session.

**Summary**

- **FR-007**: The dashboard MUST show four summary cards: Rows, Columns, Missing cells (total
  missing cells across all columns), and Duplicate rows (rows identical to an earlier row
  across all columns).
- **FR-008**: The Data quality panel MUST show every cell classified as exactly one of Valid,
  Missing, or Invalid, as a ring chart with completeness (Valid ÷ all cells) in the centre and
  a legend with percentage and count for each class.
- **FR-009**: A cell MUST count as Missing when it is empty (null), and as Invalid when it is
  present but does not fit its column's detected type (for example, text in a column whose
  other values are numbers or dates). A column's detected type is its stored type, or, for text
  columns where at least 95% of present values parse as one other type, that type.

**Column table**

- **FR-010**: The Columns table MUST list every column with: position, name, type badge,
  completeness percentage with bar, unique value count, quality badge, missing count with
  percentage, and up to three distinct example values.
- **FR-011**: Each column MUST receive exactly one quality level, checked in this order:
  **Poor** if completeness is below 90% or invalid values exceed 1% of rows; otherwise **Needs
  attention** if completeness is below 99% or it has any invalid value; otherwise **Good**.
- **FR-012**: Users MUST be able to search columns by name, filter by type and by quality level,
  and combine search with both filters; a label MUST show visible versus total columns.
- **FR-013**: Users MUST be able to sort the table by any shown column except Examples, in
  ascending or descending order, with the active sort indicated.
- **FR-014**: Users MUST be able to show or hide the optional table columns; the choice MUST
  persist across sessions.
- **FR-015**: Each row MUST offer a menu with "Show distribution", "Clean this column", "Export
  invalid rows", and "Copy column name".

**Charts**

- **FR-016**: The "Missing values by column" chart MUST show up to 10 columns with the most
  missing values in descending order, with count and percentage labels, and offer access to the
  full list when more exist.
- **FR-017**: The Distribution panel MUST show a histogram for one numeric or date/time column
  using at most 50 bins, plus Mean, Median, Std. dev., Min, and Max for that column.
- **FR-018**: The categorical panel MUST show a bar chart of at most the 10 most frequent values
  of one categorical column (text or boolean) with count and percentage labels; remaining values
  MUST be grouped into an "Other" bar.
- **FR-019**: By default the Distribution panel MUST show the first numeric column with at least
  two distinct values, and the categorical panel the first categorical column with between 2 and
  50 distinct values (else the first categorical column); users MUST be able to change either
  through a column selector in the panel or the table row menu.
- **FR-020**: Every chart element MUST expose its exact label, count, and percentage on hover and
  keyboard focus.

**Invalid-rows export**

- **FR-030**: Users MUST be able to export invalid rows from the Data quality panel (rows with
  an invalid cell in any column) and from a column's row menu (rows with an invalid cell in
  that column).
- **FR-031**: The export MUST contain each selected row exactly once, in stored row order, with
  all original columns and unchanged values, plus one added text column `reject_reason`
  (renamed with a numeric suffix if the name is already taken).
- **FR-032**: Each reject reason MUST name the column, the offending value, and the expected
  type; multiple reasons for one row MUST appear in column order separated by "; ".
- **FR-033**: The export MUST be written to a new file chosen by the user, in one of the app's
  existing export formats, and MUST NOT change the working data, its undo history, or the source
  file, nor overwrite the open source file.
- **FR-034**: The export MUST use the same Invalid definition as the current profile (FR-009),
  so the number of exported rows matches the profile's figures, and MUST be disabled when the
  profile is out of date or has no invalid values.
- **FR-035**: The export MUST run in the background with progress and Cancel, leave no partial
  file on cancel or failure, and confirm the file name and exported row count on success.

**Report**

- **FR-021**: Users MUST be able to save the current profile as a single self-contained report
  file that opens in a standard web browser offline and contains the summary cards, quality
  breakdown, charts, and full Columns table.
- **FR-022**: Generate report MUST be disabled when no current profile exists, with a hint
  explaining why.

**Layout, accessibility, and data limits**

- **FR-023**: The layout MUST follow the mockup: header, a row of four summary cards, a row of
  four chart panels, and the Columns table below; at narrower supported window widths the cards
  and panels MUST reflow to two per row and then one per row with no horizontal page scrolling.
- **FR-024**: All controls (refresh, report, search, filters, sort headers, settings, row menus,
  column selectors) MUST be reachable and operable by keyboard with visible focus, and have
  accessible names; charts MUST have a text alternative summarising their content.
- **FR-025**: Quality and status MUST NOT be conveyed by colour alone; badges MUST include text
  (Good, Needs attention, Poor) and icons or labels where colour is used.
- **FR-026**: Only bounded summaries MUST reach the screen: per-column statistics, at most 50
  histogram bins, at most 10 categories plus "Other", at most 3 examples per column, never full
  column contents.
- **FR-027**: Numbers MUST use thousands separators; percentages MUST use one decimal place.
- **FR-028**: Profiling and report errors MUST be shown as actionable messages with a retry
  action where retrying can help.
- **FR-029**: The ribbon's Profile commands "Refresh", "Column details", "Data quality",
  "Distribution", and "Duplicates" MUST respectively refresh the profile, move focus to the
  Columns table, the Data quality panel, the Distribution panel, and the Duplicate rows card.

### Key Entities

- **Profile**: The data quality summary of one dataset at one data state. Attributes: dataset,
  computed time, data state it describes, row count, column count, total missing cells,
  duplicate row count, valid/missing/invalid cell counts, and a Column Profile per column.
- **Column Profile**: Summary of one column. Attributes: position, name, detected type, missing
  count, invalid count, unique count, completeness, quality level, up to three example values,
  and either a Numeric Summary or a Category Summary.
- **Numeric Summary**: Mean, median, standard deviation, minimum, maximum, and histogram bins
  (range and count, at most 50).
- **Category Summary**: Up to 10 most frequent values with counts, plus the count of all other
  values.
- **Profile View Preferences**: Per-user table settings (visible table columns) remembered
  across sessions; chart column choices are remembered per dataset for the session.
- **Profile Report**: A saved, self-contained file rendering one Profile for sharing.
- **Rejected Rows Export**: A file holding the rows with invalid values from one data state.
  Attributes: scope (all columns or one column), original columns, a reject reason per row, and
  the number of rows exported.
- **Reject Reason**: A per-row explanation listing, for each invalid cell in scope, the column,
  the value, and the expected type.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a dataset of 100,000 rows and 25 columns, the dashboard is fully shown within
  5 seconds of opening the Profile tab on a typical desktop machine.
- **SC-002**: For a dataset of 10 million rows, profiling completes or can be cancelled without
  the interface freezing, and Cancel takes effect within 2 seconds.
- **SC-003**: Every figure on the dashboard (counts, percentages, statistics, chart bars)
  matches an independently computed reference for 100% of the profiling test datasets.
- **SC-004**: In usability testing, at least 90% of users identify the column with the most
  missing values within 15 seconds of the dashboard appearing.
- **SC-005**: Search and filter results in the Columns table update within 200 milliseconds for
  datasets with up to 500 columns.
- **SC-006**: The dashboard has no horizontal page scrolling and no clipped content at every
  supported window width, and passes automated accessibility checks with no critical issues.
- **SC-007**: A generated report opens offline in a standard browser and shows the same figures
  as the dashboard for 100% of report test cases.
- **SC-008**: For 100% of invalid-rows export test cases, the exported row count equals the
  rows with invalid values reported by the profile, every exported row has a reject reason, and
  the source file is byte-for-byte unchanged.
- **SC-009**: A user can go from seeing an invalid count on the dashboard to a saved rejected
  rows file in under 30 seconds and three actions or fewer (excluding choosing the file name).

## Assumptions

- The Profile tab replaces the current raw report view; the existing "Profile dataset" button
  becomes the automatic run plus the Refresh action.
- The ribbon's Insights commands (Creations, Patterns, Anomalies, Recommendations) are out of
  scope for this feature and stay as they are.
- "Invalid" uses type detection only; user-defined validation rules (ranges, patterns, allowed
  values) are out of scope and may come in a later feature.
- Quality thresholds (99% / 90% completeness, 1% invalid) are fixed defaults in this release
  and not user-configurable.
- Statistics for very large datasets are exact; if exact computation proves too slow, the plan
  may introduce clearly labelled approximations for unique counts and medians only.
- The report format is a single HTML file; PDF and other formats are out of scope.
- The rejected rows export adds only the `reject_reason` column; users trace rows back through
  their own key columns (e.g. an ID column). Re-importing or fixing rejected rows inside Forma is
  out of scope.
- Missing values are not invalid and do not cause a row to be exported.
- Profiles are kept for the session only; they are not saved to disk except through Generate
  report.
- Date/time columns use the Distribution panel (histogram over time); boolean columns use the
  categorical panel.
- The dashboard follows the app's existing theme, typography, and icon set; the mockup defines
  layout and content, not exact colours.
- Supported window sizes are those already supported by the desktop app.
