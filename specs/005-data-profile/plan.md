# Implementation Plan: Data Profile Dashboard

**Branch**: `005-data-profile` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-data-profile/spec.md`

## Summary

Replace the Profile tab's raw output with a dashboard laid out like the mockup. In the engine,
the single `profile()` function becomes a small profiling package: type detection with one
shared invalid-value rule, column statistics, quality levels, and bounded distributions. It
reports progress through a callable cancel token. Each history entry gains a `data_version` that
a sort-only commit inherits, so the desktop app can tell when a profile is out of date. Two new
jobs reuse the profile and the shared invalid rule: `profile.report`, which writes a
self-contained HTML file, and `profile.export_invalid`, which writes the rows that have invalid
cells, plus a `reject_reason` column, through the existing safe writer. On the desktop side, a
`profileStore` and focused components add hand-written SVG charts and a searchable, filterable,
sortable column table, with responsive reflow and keyboard support.

## Technical Context

**Language/Version**: Python 3.11+ (venv 3.14); TypeScript/TSX with React 18; Rust (Tauri 2,
unchanged)

**Primary Dependencies**: Polars, Zustand, Vite, Vitest, Testing Library, Playwright,
`@tauri-apps/plugin-dialog` (save dialog). No new dependencies.

**Storage**: Profiles are kept in memory for the session: in the desktop `profileStore`, and in
the engine only the last result per history. Table column visibility is kept in `localStorage`
(`forma.profile-columns`). Reports and reject exports go to files the user chooses.

**Testing**: pytest unit/contract/integration/performance and Ruff; Vitest unit/integration,
Playwright UI, `tsc --noEmit`, and Prettier on changed files.

**Target Platform**: Windows desktop through the existing Tauri app.

**Project Type**: Local-first desktop app with a React frontend and an independent Python engine.

**Performance Goals**: 100k × 25 profiled and shown within 5 s (SC-001); Cancel within 2 s on 10M
rows (SC-002); table search/filter within 200 ms for 500 columns (SC-005).

**Constraints**: Bounded transfer (≤ 50 bins, top 10 + other, ≤ 3 examples per column); the
working data and the source file are never changed by profiling, reports, or exports; production
files ≤ 250 formatted code lines; IPC inputs validated.

**Scale/Scope**: 1 changed IPC method (`dataset.profile`), 2 new (`profile.report`,
`profile.export_invalid`), `data_version` added to the history metadata, progress events from
the job manager, about 7 new engine modules, about 15 new desktop components/modules, and 1 new
store.

All Technical Context unknowns are resolved in [research.md](research.md) (R1–R12).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I SOLID — PASS**:
  - Each profiling concern is its own module: detection, statistics, quality, distributions,
    rejects, HTML.
  - `InvalidRowsService` and `ProfileService` have separate jobs.
  - Workers depend on a cancel-token abstraction that stays callable, so existing jobs are not
    affected (open/closed).
- **II OOP backend — PASS**:
  - `ProfileReport` grows into dataclasses (`Profile`, `ColumnProfile`, summaries) whose
    invariants are checked in `__post_init__`.
  - `CancelToken` wraps the job's state.
  - The engine imports nothing from the desktop app or Tauri, so profiling can run from scripts.
- **III Backend TDD — PASS**:
  - A failing pytest comes first for each of: detection and invalid counts, quality rule, bins and
    top-N, data_version transitions, the progress token, reject reasons and naming, report
    escaping and offline-ness, each IPC contract, and the stale and source-path guards.
  - An integration test covers profile → export → report; a performance test covers SC-001.
- **IV Frontend UX — PASS**:
  - Clear hierarchy taken from the mockup.
  - Visible states: running with progress and Cancel, stale, failed with Try again, and empty.
  - Text quality badges.
  - Keyboard-operable charts, menus, and table.
  - Responsive breakpoints checked by Playwright at 1440, 1024, and 700 px.
  - Bounded payloads only.
- **V Size & duplication — PASS with one recorded exception**: Each module is planned under 250
  lines, with the HTML renderer split from its SVG helpers. The invalid rule has one
  implementation, used by the counts and by the export. Chart drawing exists in React and in the
  HTML report (see Complexity Tracking).
- **VI/VII Formatting — PASS**: Ruff check and format on engine changes; Prettier on changed
  desktop files only (CRLF note in CLAUDE.md).
- **Architecture — PASS**:
  - All code is under `app/`.
  - There is no HTTP surface.
  - The data stays in the engine.
  - Writes are local and atomic, and never replace the source file.
  - All new IPC parameters are validated.

**Post-design re-evaluation**: PASS. The designs in [data-model.md](data-model.md) and
[contracts/](contracts/) keep all computation in the engine. They reuse `write_safe` and the
history service instead of copying them, and they add no dependency.

## Project Structure

### Documentation (this feature)

```text
specs/005-data-profile/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ipc.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md            # created by /speckit-tasks
```

### Source Code (repository root)

```text
app/engine/forma_engine/
├── domain/entities.py              # WorkingStateEntry.data_version; ChangeHistory.to_dict adds it
├── domain/errors.py                # ProfileStaleError (PROFILE_STALE)
├── services/history_service.py     # commit inherits data_version when the frame is reused
├── services/dataset_service.py     # data_version(dataset_id), history_id(dataset_id)
├── jobs/manager.py                 # CancelToken: callable + report(fraction, message)
├── io/writers.py                   # write_text_safe; shared temp-file/replace helper
├── profiling/
│   ├── type_detection.py           # NEW: detect types, invalid_mask expression
│   ├── column_stats.py             # NEW: one-pass per-column aggregates, examples
│   ├── quality.py                  # NEW: completeness, quality level, breakdown
│   ├── distributions.py            # NEW: histograms, category top-N
│   ├── report.py                   # Profile / ColumnProfile / summary dataclasses
│   ├── statistics.py               # profile(): phases, progress, cancel
│   ├── rejects.py                  # NEW: reject reason expression, reason column name
│   ├── html_report.py              # NEW: self-contained HTML document
│   └── html_charts.py              # NEW: inline SVG ring / bars for the report
├── services/profile_service.py     # submit profile, keep last per history, submit report
├── services/invalid_rows_service.py# NEW: guarded reject export through write_safe
├── ipc/profile_handlers.py         # dataset.profile, profile.report, profile.export_invalid
├── ipc/router.py, bootstrap.py     # register methods and services
├── profiling/tools/                # NEW (US7–US9): one module per tool, pure functions
│   ├── column_detail.py            #   quartiles, text length, top 50, invalid values
│   ├── rows.py                     #   problem / outlier row pages
│   ├── duplicates.py               #   duplicate groups for key columns
│   ├── correlations.py, formats.py #   Patterns
│   ├── outliers.py                 #   IQR bounds, counts, extremes
│   └── recommendations.py, creations.py   # fixed-rule suggestions
├── services/profile_tools_service.py      # NEW: stale check + job per tool
├── ipc/profile_tool_handlers.py    # NEW: profile.column_detail … profile.suggestions
├── transformations/cleaning_operations.py, cleaning_validators.py  # extract_date_parts
└── tests/ (unit/profiling, unit/jobs, unit/services, contract, integration, performance)

app/desktop/src/
├── types/profile.ts                # NEW: Profile, ColumnProfile, summaries
├── stores/profileStore.ts          # NEW: per-history profile, run state, chart picks, prefs
├── services/demoProfile.ts         # NEW: demo fixture; demoData routes dataset.profile
├── features/profiling/
│   ├── ProfileDashboard.tsx        # NEW: replaces ProfilePanel; layout and empty/error states
│   ├── ProfileHeader.tsx           # NEW: title, last updated, stale, refresh, report, progress
│   ├── SummaryCards.tsx            # NEW
│   ├── QualityPanel.tsx            # NEW: ring, legend, Export invalid rows
│   ├── MissingValuesPanel.tsx      # NEW
│   ├── DistributionPanel.tsx       # NEW: histogram + stats + selector
│   ├── CategoryPanel.tsx           # NEW
│   ├── charts/RingChart.tsx, HorizontalBars.tsx, VerticalBars.tsx, ChartTooltip.tsx
│   ├── charts/chartScale.ts        # NEW: ticks, scales (pure)
│   ├── columns/ColumnTable.tsx, ColumnTableToolbar.tsx, ColumnRowMenu.tsx,
│   │   ColumnSettingsMenu.tsx      # NEW
│   ├── columns/columnTableModel.ts # NEW: search/filter/sort (pure)
│   ├── profileFormat.ts            # NEW: number, percent, time formatting
│   ├── useProfileJob.ts            # auto-run, refresh, cancel, progress, staleness
│   └── useProfileExports.ts        # NEW: save dialogs + report/export jobs
├── features/workspace/WorkflowActions.tsx, ribbonCommands.ts, useWorkflowJobEvents.ts
│                                   # mount dashboard, ribbon focus targets, progress events
├── stores/profileToolStore.ts      # NEW (US7–US9): open tool, inputs, results, dismissals
├── features/profiling/tools/       # NEW: ToolView shell, useToolJob, one component per tool,
│                                   #   RowsGrid, BoxPlot, CorrelationGrid, SuggestionCard
└── styles/profile.css, profile-responsive.css   # NEW

app/desktop/tests/
├── unit/profiling/                 # model, format, scale, components, store
├── integration/profile-dashboard.test.tsx
└── ui/profile-dashboard.pw.ts      # reflow, table scroll, keyboard
```

**Tools (added 2026-11-07)**: each ribbon tool is a pure engine function over the lazy frame
(tested against references computed in the test), a shared `ProfileToolsService` that checks
`data_version` and submits the job, and a desktop component loaded into the Profile content area
by `profileToolStore`. Suggestions reuse the cleaning store's `add` so the Clean tab is never
opened. The one new Clean operation, `extract_date_parts`, follows the existing operation,
validator, and step-catalog pattern.

**Structure Decision**: Extend the existing engine `profiling` package and the desktop
`features/profiling` folder. `ProfilePanel.tsx` is removed once `ProfileDashboard` replaces it,
after grepping `src` and `tests` for its imports (existing
`tests/integration/profile-clean-workflow.test.tsx` will need updating).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Chart drawing exists twice: React SVG in the desktop app and inline SVG in the engine's HTML report (principle V) | The report must open offline without Forma (FR-021) and be testable as backend behaviour; the dashboard must be interactive and accessible. They run in different runtimes. | One renderer for both needs either a Node renderer inside the engine or serialising the live DOM. Both add runtime coupling the constitution forbids, and DOM serialisation also loses offline styling. All logic (bins, top-N, quality) is computed once in the engine; only drawing is repeated. |
