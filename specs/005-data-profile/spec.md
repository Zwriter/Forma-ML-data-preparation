# Feature Specification: Data Profile Dashboard

**Feature Branch**: `005-data-profile`

**Created**: 2026-11-05

**Status**: Draft (extended 2026-11-07: ribbon tools, US7–US9)

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

### Session 2026-11-07

- Q: What should the Profile ribbon buttons do? → A: Each one opens a tool (US7–US9) instead of
  only moving focus: Refresh gains an automatic mode; Column details, Data quality,
  Distribution, Duplicates, Patterns, Anomalies, Recommendations, and Creations each load a tool
  view.
- Q: Where do the tools appear? → A: Inside the Profile tab, in place of the dashboard. They never
  switch to another tab; steps suggested by a tool are added to the Clean steps in the
  background and confirmed with a notice.

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

### User Story 7 - Investigate with the Profile Tools (Priority: P3)

As a data analyst, I want the Profile ribbon to open focused tools for one column, problem cells,
distributions, and duplicates so that I can dig into what the dashboard shows without leaving
the Profile tab.

**Why this priority**: The dashboard answers "how healthy is this data"; these tools answer
"where exactly, and what do I do about it". Useful after US1–US3 are in place.

**Independent Test**: With a profiled dataset, open each tool from the ribbon, check its figures
against a reference computed in the test, return to the dashboard with "Back to dashboard",
Escape, and the active ribbon button, and confirm the active tab never changes.

**Acceptance Scenarios**:

1. **Given** the dashboard, **When** the user selects a Profile tool in the ribbon, **Then** the
   Profile content area shows that tool in place of the dashboard, the ribbon button shows as
   pressed, and the Profile tab stays active.
2. **Given** an open tool, **When** the user selects "Back to dashboard", presses Escape, or
   selects the pressed ribbon button again, **Then** the dashboard returns with focus on the
   ribbon button that opened the tool.
3. **Given** "Refresh automatically" is on, **When** the data changes while the Profile tab is
   shown, or the user returns to the Profile tab after a change, **Then** profiling starts on its
   own; with it off, the profile is only marked out of date.
4. **Given** Column details, **When** it opens, **Then** it shows the column selected in the
   Columns table (or the first column): type, all counts, quartiles and the full histogram or
   every top value (up to 50), text length (shortest, longest, average), and up to 10 invalid
   values with their reasons; Previous and Next move to the neighbouring column.
5. **Given** Data quality, **When** it opens, **Then** it lists only rows with at least one
   missing or invalid cell, a page of up to 100 rows at a time, with missing cells shown as
   "Missing" and invalid cells marked with a warning icon and their reason; "Next problem" and
   "Previous problem" move focus between problem cells, and a column filter limits the list to
   problems in one column.
6. **Given** Distribution, **When** the user picks a number or date column, **Then** it shows a
   large histogram with 10, 20, 30, or 50 bars, an optional log scale, and a box plot with
   quartiles, whiskers at 1.5 × the interquartile range, and the outlier count.
7. **Given** Duplicates, **When** the user picks the columns that identify a row (all columns by
   default), **Then** it shows the number of duplicate rows and groups for that choice and the
   20 largest groups with their values and sizes; "Add step: Remove duplicates" adds a remove
   duplicates step for those columns to the Clean steps, keeping the first row of each group.

---

### User Story 8 - Spot Patterns and Anomalies (Priority: P3)

As a data analyst, I want to see which columns move together, which text values have
inconsistent formats, and which values are unusually far from the rest so that I find problems
and relationships the summary statistics hide.

**Why this priority**: Diagnostic depth beyond the dashboard; independent of US7 and US9.

**Independent Test**: Profile a fixture with known correlated columns, mixed phone formats, and
planted outliers; open Patterns and Anomalies and compare every figure with the reference.

**Acceptance Scenarios**:

1. **Given** at least two number columns, **When** Patterns opens, **Then** it shows a
   correlation grid with the coefficient and a strength word in every cell and the five
   strongest pairs written out (for example "MonthlyCharges ↔ TotalCharges: strong (0.83)").
2. **Given** text columns, **When** Patterns opens, **Then** each text column lists its five most
   common value formats with their share (letters as "A", digits as "9", other characters kept),
   and columns whose top format covers less than 90% of values are flagged "Mixed formats".
3. **Given** number or date columns, **When** Anomalies opens, **Then** each column lists the
   count and share of values outside 1.5 × the interquartile range, the normal range, and the
   five most extreme values, ordered by outlier count.
4. **Given** an anomaly entry, **When** the user selects "Show rows", **Then** up to 100 rows with
   an outlier in that column are shown in the tool, with the outlier cell marked.

---

### User Story 9 - Get Suggested Fixes and New Columns (Priority: P3)

As a data analyst, I want the profile to suggest cleaning steps and useful new columns so that I
can fix common problems and enrich the data in a few clicks.

**Why this priority**: Turns findings into actions; independent of US7 and US8.

**Independent Test**: Profile a fixture with text-stored numbers, a few missing values, a mostly
empty column, a constant column, duplicates, a date column, and a delimited name column; check
each suggestion, add them, and apply the resulting Clean steps without validation errors.

**Acceptance Scenarios**:

1. **Given** a profile, **When** Recommendations opens, **Then** it shows one card per finding
   with what was found, the figures behind it, and the step it proposes, ordered by the number of
   cells affected.
2. **Given** a recommendation, **When** the user selects "Add step", **Then** the step is added to
   the Clean steps for this file, the Profile tab stays active, a notice confirms it with an Undo
   action, and the card shows "Added".
3. **Given** a recommendation, **When** the user selects "Dismiss", **Then** it is hidden until
   the data changes.
4. **Given** Creations, **When** it opens, **Then** it suggests date parts (year, month, day,
   weekday) for date columns and a split for text columns with a consistent separator, each with
   three example results and "Add step".

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
- **Tool opened with no profile**: the tool shows "Profile the dataset first" with a Profile now
  button; with an out-of-date profile it shows the same "Out of date" notice as the dashboard.
- **Nothing to show in a tool**: Data quality shows "No missing or invalid cells", Duplicates
  "No duplicate rows for these columns", Patterns "Needs at least two number columns" for the
  grid, Anomalies "No outliers found", Recommendations "No suggestions", Creations "No new
  columns to suggest".
- **No spread** (interquartile range of 0): Anomalies shows "Too little spread to judge" for that
  column instead of flagging every other value.
- **More than 20 number columns**: the correlation grid uses the 20 most complete and says how
  many were left out.
- **A recommended step already exists in the Clean steps**: its card shows "Added".
- **A fill recommendation for a column stored as text**: adding it also adds the column's Convert
  step first if it is not already in the Clean steps, so the fill can use the median.
- **Generated column name already exists** (for example `joined_year`): Creations proposes the
  next free name (`joined_year_1`).

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
- **FR-029**: Each Profile ribbon command except Refresh MUST load its tool view in the Profile
  content area in place of the dashboard, without changing the active tab. The tool view MUST
  have a heading naming the tool and a "Back to dashboard" button; Escape and selecting the
  pressed ribbon command also return to the dashboard, with focus on that command. The command
  for the open tool MUST show as pressed (`aria-pressed`). Tool views follow the dashboard's fit
  rule: only their own lists or grids scroll.
- **FR-036**: Refresh MUST re-profile on click and offer a "Refresh automatically" switch,
  remembered across sessions and off by default. When on, profiling starts whenever the data
  changes while the Profile tab is shown, or when the user returns to it after a change.
- **FR-037**: Column details MUST show one column: type, missing, invalid, and unique counts,
  completeness, quartiles (Q1, median, Q3) for number and date columns, the full histogram or up
  to 50 top values, text length (shortest, longest, average) for text columns, and up to 10
  distinct invalid values with their reasons. It opens on the column selected in the Columns
  table, otherwise the first column, and has a column picker plus Previous and Next.
- **FR-038**: Data quality MUST list the rows that have at least one missing or invalid cell, in
  stored row order, in pages of up to 100 rows, with the row number and total problem rows.
  Missing cells show "Missing"; invalid cells show their value, a warning icon, and their reason
  as the accessible description. "Next problem" and "Previous problem" move focus between
  problem cells across pages, and a column filter limits the list to problems in one column.
- **FR-039**: Distribution MUST show one number or date column with a choice of 10, 20, 30, or 50
  bars, a log-scale switch, and a box plot (Q1, median, Q3, whiskers at the furthest values
  within 1.5 × IQR, and the count of values beyond them).
- **FR-040**: Duplicates MUST let the user choose the columns that identify a row (default all)
  and show the duplicate row count (rows beyond the first in each group), the group count, and
  the 20 largest groups (key values and size, ties by first appearance). "Add step: Remove
  duplicates" MUST add a `drop_duplicates` step for the chosen columns, keeping the first row.
- **FR-041**: Patterns MUST show Pearson correlations between up to 20 number columns (the most
  complete first), computed on rows where both values are valid, with "—" for pairs sharing
  fewer than 10 rows; each cell shows the coefficient (two decimals) and a word: "strong"
  (|r| ≥ 0.7), "moderate" (≥ 0.4), "weak" (≥ 0.2), or "none". It MUST list the five strongest
  pairs, and for each text column the five most common value formats (letters as "A", digits as
  "9", other characters kept, cut to 30 characters) with their share, flagging "Mixed formats"
  when the top format covers less than 90% of present values.
- **FR-042**: Anomalies MUST, for each number or date column, count the valid values outside
  [Q1 − 1.5 × IQR, Q3 + 1.5 × IQR], and show that count and share, the range, and the five values
  furthest outside it; columns are ordered by outlier count. "Show rows" MUST show up to 100 rows
  with an outlier in that column, in stored row order, with the outlier cell marked.
- **FR-043**: Recommendations MUST be produced by these fixed rules, each with its figures:
  - "Convert": a column stored as text whose detected type is integer, decimal, date, or boolean
    → `convert_type` to that type, noting how many invalid values will become missing.
  - "Fill missing": 0 < missing ≤ 20% → `fill_null` with the median for number columns, the most
    frequent value otherwise.
  - "Drop mostly empty column": missing > 90% → `drop_columns`.
  - "Drop constant column": one unique value in more than one row → `drop_columns`.
  - "Remove duplicate rows": duplicate rows > 0 → `drop_duplicates` on all columns.

  Cards are ordered by cells affected. "Add step" adds the step to the Clean steps for the open
  file without changing tab and confirms with a notice that has Undo. "Dismiss" hides a card
  until the data version changes.
- **FR-044**: Creations MUST suggest (a) date parts — year, month, day, and weekday — for every
  date column, as one new `extract_date_parts` Clean step that adds `{column}_{part}` columns
  after the source column, and (b) a split for text columns where at least 95% of present values
  contain the same separator (", ", ",", ";", "|", "/", " - ", or a single space) the same number
  of times (1 to 3) → `split_column` into that many parts. Each suggestion shows three example
  results; names that already exist get the next free number. "Add step" behaves as in FR-043.
- **FR-045**: Tool figures MUST be computed by the engine on the current data version as
  background jobs with progress and Cancel, using the profile's invalid rule (FR-009). Only
  bounded results reach the screen: 50 top values, 10 invalid values, 100 rows per page, 20
  duplicate groups, a 20 × 20 correlation grid, 5 formats per column, and 5 extreme values per
  column. A tool for an older data version shows "Out of date" and refreshes with the profile.
- **FR-046**: Every tool control MUST be reachable by keyboard with an accessible name, grid cells
  MUST expose their values and markers as text, and strength words, markers, and badges MUST NOT
  rely on colour alone.

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
- **Profile Tool View**: Which tool is loaded in the Profile content area (dashboard by default)
  and its inputs (column, bars, key columns, page).
- **Column Detail**: Everything about one column at one data version (FR-037).
- **Problem Rows Page**: Up to 100 rows with missing or invalid cells, their row numbers, and a
  marker per problem cell.
- **Duplicate Groups**: For a set of key columns: duplicate row count, group count, and the
  largest groups.
- **Correlation Grid**: Pairwise coefficients between up to 20 number columns, plus the strongest
  pairs.
- **Value Format**: A value shape (for example "999-9999") with its share in a text column.
- **Outlier Summary**: Per column: bounds, outlier count and share, and the most extreme values.
- **Suggestion**: A Recommendation or Creation: kind, column(s), the figures behind it, the
  proposed Clean step, and example results.

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
- **SC-010**: For a dataset of 100,000 rows and 25 columns, every tool view shows its results
  within 3 seconds of opening, and the active tab never changes while using the tools.
- **SC-011**: Every figure in the tool views (quartiles, problem rows, duplicate groups,
  correlations, formats, outliers) matches an independently computed reference for 100% of the
  tool test datasets.
- **SC-012**: For 100% of suggestion test cases, the steps added by Recommendations and Creations
  pass Clean validation and apply without errors.

## Assumptions

- The Profile tab replaces the current raw report view; the existing "Profile dataset" button
  becomes the automatic run plus the Refresh action.
- The ribbon's Insights commands (Creations, Patterns, Anomalies, Recommendations) are in scope
  as US8 and US9 (added 2026-11-07). Recommendations use fixed rules, not machine learning.
- Creations adds one new Clean operation, `extract_date_parts`; every other suggested step uses an
  existing operation.
- Dismissed recommendations and the open tool are remembered for the session only; "Refresh
  automatically" is remembered across sessions.
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
