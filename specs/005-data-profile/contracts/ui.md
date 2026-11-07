# UI Contract: Profile Tab

Accessible names and roles that tests (Vitest and Playwright) rely on. Visible text is in quotes.

## Regions (in DOM order)

| Region | Role / name | Notes |
|--------|-------------|-------|
| Header | `region` "Data profile" | h2 "Data profile", subtitle, `time` element with last-updated time, "Out of date" status text when stale |
| Summary | `list` "Dataset summary" | 4 `listitem` cards: "Rows", "Columns", "Missing cells", "Duplicate rows"; the duplicates card has `tabIndex=-1` |
| Data quality | `region` "Data quality" | Ring `img` with `aria-label` summary; legend list with Valid / Missing / Invalid; "Export invalid rows" button |
| Missing values | `region` "Missing values by column" | "Show all" button when > 10 columns have missing values |
| Distribution | `region` "Distribution of {column}" | Column `combobox` "Distribution column"; stats `list` (Mean, Median, Std. dev., Min, Max) |
| Categories | `region` "{column} (categorical)" | Column `combobox` "Categorical column" |
| Columns | `region` "Columns" | `searchbox` "Search columns", `combobox` "Type filter", `combobox` "Quality filter", `status` count text, `button` "Table settings", `table` "Column profiles" |

Each chart region has `tabIndex=-1` so ribbon commands can focus it.

## Header actions

- `button` "Refresh profile": disabled while running.
- `button` "Generate report": disabled with `title` "Profile the dataset first" when there is no
  profile, or "Refresh the profile first" when it is out of date.
- While running: `progressbar` "Profiling progress" (with value when known) and `button` "Cancel".

## Columns table

- Sortable headers are `button`s inside `columnheader`s with `aria-sort` = `ascending`,
  `descending`, or `none`. Examples is not sortable.
- Row menu: `button` "Actions for {column}" opens a `menu` with `menuitem`s "Show distribution"
  (only when the column has a summary), "Clean this column", "Export invalid rows" (shown only
  when `invalid_count > 0`, the profile is current, and no export is running), and "Copy column
  name". The Data quality panel's "Export invalid rows" button stays visible and is disabled with
  its reason as the title ("No invalid values" or "Refresh the profile first").
- Table settings `menu` holds `menuitemcheckbox`es for Type, Completeness, Unique values, Quality,
  Missing, and Examples.
- Quality badge text is "Good", "Needs attention", or "Poor", with an icon beside it.
- Empty result: text "No columns match" and `button` "Clear filters".

## Tool views (US7–US9)

- The ribbon commands Column details, Data quality, Distribution, Duplicates, Patterns,
  Anomalies, Recommendations, and Creations are toggle `button`s with `aria-pressed`. Selecting
  one replaces the dashboard with `region` "{tool name}" inside the Profile content area; the
  active tab never changes.
- Every tool view starts with h2 "{tool name}", a `button` "Back to dashboard", and the same
  "Out of date" status and progress/Cancel as the header. Escape (outside open menus) and the
  pressed ribbon command return to the dashboard with focus on that command.
- Header: next to "Refresh profile", a `switch` "Refresh automatically".
- Column details: `combobox` "Column", `button`s "Previous column" / "Next column", stats `list`,
  chart (bars as in the dashboard), `list` "Invalid values".
- Data quality: `combobox` "Problems in" (All columns or one column), `table` "Problem rows" with
  a "Row" column, `button`s "Previous problem" / "Next problem", "Previous page" / "Next page",
  `status` "Rows {a}–{b} of {n}". Missing cells read "Missing"; invalid cells have a warning icon
  and `aria-description` with the reason.
- Distribution: `combobox` "Column", `radiogroup` "Bars" (10, 20, 30, 50), `switch` "Log scale",
  `img` "Box plot" with an `aria-label` listing Q1, median, Q3, whiskers, and outlier count.
- Duplicates: `button` "Key columns" opening a `menu` of `menuitemcheckbox`es, `status` with the
  duplicate row and group counts, `table` "Duplicate groups", `button` "Add step: Remove
  duplicates".
- Patterns: `table` "Correlations" (row and column headers are column names; each cell reads
  "0.83 strong"), `list` "Strongest pairs", and a `list` "Value formats" with one item per text
  column ("Mixed formats" text when flagged).
- Anomalies: `table` "Outliers by column" with a `button` "Show rows for {column}" per row; the
  rows appear in `table` "Outlier rows" below, with the outlier cell marked by an icon and text.
- Recommendations and Creations: `list` of `article` cards, each with h3 title, the figures, an
  example `table` (Creations), `button` "Add step" (reads "Added" and disabled once added), and
  `button` "Dismiss" (Recommendations). Adding shows a notification "Added "{step}" to Clean
  steps" with an Undo button.

## Keyboard

- Tab reaches header actions, summary card targets, chart bars, selectors, table controls, and
  row menus in visual order.
- Chart bars: Tab moves through bars, and focus shows the tooltip.
- Menus: Arrow keys move, Enter/Space activates, Escape closes and returns focus to the trigger.

## Layout breakpoints (content width)

| Width | Summary cards | Chart panels |
|-------|---------------|--------------|
| ≥ 1000 px | 4 per row | 4 per row |
| 640–999 px | 2 per row | 2 per row |
| < 640 px | 1 per row | 1 per row |

The Columns table scrolls inside its region (horizontally and vertically) with a sticky header.
The page itself never scrolls horizontally.

The dashboard fills the workspace without a dataset heading above it. At normal desktop and
full-screen sizes nothing scrolls except the Columns table, which takes the leftover height
(at least 210 px). Only windows too short to hold everything fall back to scrolling the
dashboard.
