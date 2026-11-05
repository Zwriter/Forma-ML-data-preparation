# Research: Data Profile Dashboard

**Feature**: [spec.md](spec.md) | **Date**: 2026-11-05

Each section resolves one open question from the Technical Context in [plan.md](plan.md).

## R1. How the app knows a profile is out of date

- **Decision**: Add `data_version` (a UUID string) to each `WorkingStateEntry`.
  `HistoryService.commit` gives a new entry a fresh version, except when the new entry reuses
  the current frame object (the sort-only commit from feature 004): then it inherits the current
  version. `ChangeHistory.to_dict()` returns `data_version` of the current entry. Every profile
  result carries the `history_id` and `data_version` it was computed from. The desktop app marks a
  profile out of date when either differs from the current history metadata.
- **Rationale**: `dataset_id` changes on every commit, including sorts, so it cannot tell data
  changes from view changes. A version tied to the frame object gives "sort is not a change"
  (spec US5 scenario 3) for free, and undo/redo land on entries that keep their own versions, so
  undoing back to the profiled state makes the profile current again.
- **Alternatives considered**: Hashing the data (too slow on millions of rows); using
  `current_index` (indices shift when history is trimmed and repeat after undo + new commit);
  comparing `dataset_id` (marks profiles stale after a sort).

## R2. Detecting column types and invalid values

- **Decision**: New `profiling/type_detection.py`. Columns with a non-text stored type keep it and
  have zero invalid cells. For each text column, in one lazy aggregation, count non-null values
  and how many parse (non-strict casts after trimming whitespace) as each candidate, checked in
  order: integer, decimal, date/time, boolean (`true`/`false`, case-insensitive). The detected
  type is the first candidate whose parsed share of non-null values is at least 0.95; otherwise
  text. A cell is **invalid** when it is non-null and fails to parse as the detected type. The
  module exposes both the detection step and an `invalid_mask(column, detected_type)` expression,
  which the profile counts and the reject export filters on.
- **Rationale**: One authoritative definition shared by the dashboard counts and the export makes
  FR-034 ("exported rows match the profile") true by construction. Non-strict casts are
  vectorised and lazy, so detection costs one pass for all text columns.
- **Alternatives considered**: Sampling the first N rows (misses late invalid values, and the
  export would disagree with the counts); regex checks per type (slower, and duplicates what the
  casts already do); detecting in the desktop app (breaks the bounded-transfer rule).

## R3. Where quality levels and completeness are computed

- **Decision**: The engine computes completeness, invalid share, and the quality level
  (`good` / `needs_attention` / `poor`) per column in `profiling/quality.py`, using the ordered
  rule from FR-011. The desktop app only shows the value and maps it to a label and icon.
- **Rationale**: One implementation (constitution V); scripts and notebooks get the same levels;
  the HTML report reads the same field.
- **Alternatives considered**: Computing levels in TypeScript (would need a second copy for the
  HTML report).

## R4. Distribution summaries and their bounds

- **Decision**: New `profiling/distributions.py`, run after the column statistics pass.
  - **Histograms** for every numeric and date/time column with at least one value: at most 30
    bins by default (hard cap 50, FR-017); integer columns with 30 or fewer distinct values get
    one bin per value. Bin index = `floor((value − min) / width)`, clipped to the last bin, then a
    `group_by` count. Date/time values are binned on their epoch value and reported with ISO
    labels.
  - **Category summaries** for every text (detected text) and boolean column: top 10 values by
    count, ties broken by value, plus `other_count` (FR-018).
  - All summaries are computed up front so that switching the chart column in the dashboard is
    instant and the report can include any column.
- **Rationale**: Payload stays bounded: 500 columns × 30 bins is 15,000 numbers. Fixed bin counts
  look like the mockup and are simple to test against reference values.
- **Alternatives considered**: Freedman–Diaconis bins (needs quantiles per column, a further pass,
  and unpredictable bin counts); computing a histogram on demand when the user switches columns
  (adds an IPC round trip and a job per click, and the report would need its own path).

## R5. Showing profiling progress

- **Decision**: `JobManager` passes workers a `CancelToken` object that is still callable
  (`cancelled()` returns the cancel flag, so all existing workers keep working unchanged) and adds
  `report(fraction, message)`, which updates `job.progress` and `job.message` and emits a
  `job.progress` event. Profiling reports after each phase: types, column statistics, duplicates,
  distributions (per column batch).
- **Rationale**: Gives FR-002 progress and cancel checks at the same points, without changing the
  signature of existing jobs.
- **Alternatives considered**: A new positional `progress` argument (changes every worker);
  polling `job.status` from the desktop app (extra traffic and no new information).

## R6. Charts in the desktop app

- **Decision**: Hand-written SVG React components: a ring, horizontal bars, and vertical bars
  (histogram and categories share the vertical one). Tick and scale maths live in one pure module,
  `charts/chartScale.ts`. Each bar is a focusable element with an `aria-label`, and a shared
  tooltip shows label, count, and percentage on hover and focus (FR-020). Each chart has a
  visually hidden text summary (FR-024).
- **Rationale**: Three simple chart shapes do not justify a charting dependency. Our own SVG keeps
  full control of keyboard focus and theming, and it is testable in jsdom.
- **Alternatives considered**: Recharts or Chart.js (large bundle, canvas output is hard to make
  accessible, styling fights the app theme).

## R7. Generating the HTML report

- **Decision**: The engine writes the report. `profiling/html_report.py` renders the profile result
  to one HTML string with inline CSS and inline SVG charts, escaping every value with
  `html.escape`. `profiling/html_charts.py` holds the SVG helpers. It is written through a new
  `write_text_safe` in `io/writers.py`, which shares the temp-file-then-replace helper with
  `write_safe`. It runs as a `profile.report` job that receives the `history_id` and
  `data_version` it should describe and fails with `PROFILE_STALE` if they no longer match.
- **Rationale**: The report is backend behaviour that can be tested with pytest (constitution III),
  and it can be reused from scripts (constitution II). The engine already owns safe file writing.
  The bins, top-N values, and quality levels are computed once in the engine. Only the drawing
  exists twice, React SVG and HTML SVG, because they run in different runtimes. Plan.md records
  this as a deliberate exception to the no-duplication rule.
- **Alternatives considered**: Serialising the rendered dashboard DOM (pulls in app CSS, breaks
  offline, can't be tested in the engine); a template engine such as Jinja2 (a new dependency for
  one template); PDF output (out of scope per spec Assumptions).

## R8. Exporting invalid rows with a reject reason

- **Decision**: New `profiling/rejects.py`. It builds, for each column in scope (all columns, or
  one column), the expression `when(invalid_mask).then(format('{col}: "{value}" is not {type}'))`.
  Values are cut to 60 characters, ending with `…`. Type phrases are "an integer", "a decimal
  number", "a date/time", and "a boolean". The per-column reasons are joined with
  `concat_str(separator="; ", ignore_nulls=True)` in column order. The result is the current frame
  plus that column, filtered to rows where the reason is not null. The column name is
  `reject_reason`, or `reject_reason_N` with the first free N. A new `InvalidRowsService` validates
  the `data_version`, refuses a destination equal to the dataset's source path, and writes through
  the existing `write_safe` (CSV or Parquet, temp file, validation, no partial file on cancel or
  failure). It runs as a `profile.export_invalid` job and returns `row_count`.
- **Rationale**: It reuses R2's mask, so counts match. The writer, validation, and overwrite rules
  are the ones already used by exports. It reads the stored frame, so rows stay in stored order
  even when a sort view is active (spec edge case).
- **Alternatives considered**: Exporting only the invalid cells (the user asked for rows); one
  reason column per data column (wide and hard to read); routing through `ExportService` with a
  transform hook (mixes two responsibilities in one service).

## R9. Session reuse and remembered preferences in the desktop app

- **Decision**: New `stores/profileStore.ts` (Zustand) keyed by `history_id`. It holds the last
  profile and its versions, the run state (`idle | running | ready | failed`), the job id, the
  progress, and the chart column picks. Staleness is derived on the fly, never stored. Opening the
  Profile tab runs a profile only when there is none for the current `history_id` +
  `data_version` (FR-001, FR-006). Visible table columns are saved in `localStorage` under
  `forma.profile-columns`, with the same guarded read pattern as `settingsStore`, so they survive
  sessions (FR-014).
- **Rationale**: It follows the established stores. Deriving staleness avoids keeping it in sync by
  hand.
- **Engine side**: `ProfileService` keeps only the last finished profile per `history_id` (a few
  hundred KB at most), so `profile.report` can render it without the desktop app sending the
  profile back over IPC.
- **Alternatives considered**: A full profile cache in the engine keyed by every version (more
  memory for no user benefit); sending the profile from the desktop app with the report request
  (a large client payload the engine would have to re-validate).

## R10. Performance on large datasets

- **Decision**: Profiling makes at most four lazy passes: (1) type detection for text columns;
  (2) one combined aggregation for missing, unique, invalid, mean, std, min, max, and median per
  column, plus the row count; (3) duplicate rows (`struct(...).n_unique()`, the existing approach);
  (4) distributions, batched per column with cancel checks between batches. Examples come from the
  first 10,000 rows (`head(10_000)` then the first 3 distinct non-null values). All statistics are
  exact. The spec allows approximations later if needed.
- **Rationale**: Meets SC-001 (100k × 25 within 5 s) and keeps cancel latency under 2 s (SC-002)
  thanks to checks between phases and batches. The bounded result keeps the IPC payload small.
- **Alternatives considered**: Approximate unique counts and medians now (not needed at target
  sizes, and results would be harder to test exactly).

## R11. Demo mode and Playwright coverage

- **Decision**: Demo mode answers `dataset.profile` with a completed result built from a static
  fixture (`services/demoProfile.ts`, shaped per [contracts/ipc.md](contracts/ipc.md)). The
  demo's `dataset.history` returns a fixed `data_version`. `profile.report` and
  `profile.export_invalid` are not implemented in demo mode. They stay covered by Vitest
  (mocked IPC) and pytest, the same as `cleaning.*` today.
- **Rationale**: Playwright needs a real layout to check the reflow (FR-023), table scrolling, and
  keyboard focus. The file-writing paths need the engine anyway.
- **Alternatives considered**: Computing a profile in TypeScript from the demo table (a second
  profiling implementation).

## R12. Ribbon Profile commands

- **Decision**: `Refresh` re-runs profiling. `Column details`, `Data quality`, `Distribution`,
  and `Duplicates` move keyboard focus to, and scroll to, the Columns table, the Data quality
  panel, the Distribution panel, and the Duplicate rows card. Each target is a labelled region
  with `tabIndex={-1}`. The Insights commands are unchanged.
- **Rationale**: Gives the existing ribbon buttons a predictable meaning (FR-029) with no new UI.
- **Alternatives considered**: Opening separate views per command (more navigation, and the
  dashboard is meant to be one screen).
