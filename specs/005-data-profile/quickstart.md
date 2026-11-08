# Quickstart: Data Profile Dashboard

How to prove the feature works end to end. The shapes are in [data-model.md](data-model.md),
[contracts/ipc.md](contracts/ipc.md), and [contracts/ui.md](contracts/ui.md).

## Prerequisites

- Engine venv: `app/engine/.venv` (Python 3.11+), with Polars installed.
- Desktop dependencies: `npm install` in `app/desktop`, then `npx playwright install chromium`.
- Test datasets (created by test fixtures, not committed as large files):
  - `mixed.csv`: integer, decimal, text, boolean, and date columns, with known missing values,
    3 duplicate rows, a mostly numeric text column `amount` with 2 non-numeric values ("n/a",
    "12,5"), and a column named `reject_reason`.
  - `empty.csv`: a header only.
  - A generated 100,000 × 25 frame for the timing check.

## Engine checks

```bash
app/engine/.venv/Scripts/python.exe -m pytest app/engine/tests/unit/profiling app/engine/tests/unit/jobs app/engine/tests/unit/services
```

```bash
app/engine/.venv/Scripts/python.exe -m pytest app/engine/tests/contract app/engine/tests/integration/test_profile_dashboard_workflow.py
```

Expected:

1. Profiling `mixed.csv` gives counts, completeness, quality levels, histograms, and top
   categories equal to hand-computed reference values. Valid + missing + invalid equals the total
   number of cells.
2. `amount` is detected as `decimal` with `invalid_count = 2` and quality `needs_attention`.
3. A sort-only commit keeps `data_version`, a Clean apply changes it, and undo restores the old
   one.
4. `profile.export_invalid` with `column: null` writes exactly the 2 invalid rows in stored order,
   adds `reject_reason_1` (because `reject_reason` already exists), and gives reasons like
   `amount: "n/a" is not a decimal number`. The source file's bytes are unchanged.
5. Exporting to the source path fails with `FILE_ACCESS_ERROR`. A stale `data_version` fails with
   `PROFILE_STALE`. Cancelling leaves no file.
6. `profile.report` writes one `.html` file containing no external URLs. It shows the summary
   figures and every column name, with HTML-escaped values.
7. Profiling `empty.csv` gives `row_count = 0` and `completeness = null`, and does not fail.
8. The timing test profiles 100,000 × 25 in under 5 s, and cancelling a large profile finishes
   within 2 s.

## Desktop checks

```bash
cd app/desktop && npx vitest run tests/unit/profiling tests/integration/profile-dashboard.test.tsx
```

```bash
cd app/desktop && npm run test:ui -- tests/ui/profile-dashboard.pw.ts
```

Expected:

1. Opening the Profile tab starts a profile once. Returning to the tab does not start another.
   A Clean apply shows "Out of date", and a sort does not.
2. Search, the type and quality filters, and sorting give the right rows and the "N of M columns"
   label. Hidden columns stay hidden after a reload.
3. The row menu's "Show distribution" switches the chart panel. "Export invalid rows" sends
   `profile.export_invalid` with the column name (mocked IPC).
4. Generate report is disabled with no profile or a stale one, and it sends `profile.report` when
   enabled (mocked IPC).
5. Playwright (demo build, fixture profile) at 1440, 1024, and 700 px wide shows cards and panels
   at 4, 2, and 1 per row, with no horizontal page scroll. The Columns table scrolls inside its
   region when moved with `page.mouse.wheel`, with its header staying in place. Tab order reaches
   every control, and Escape closes menus.
6. Break the reflow CSS once and confirm the Playwright test fails.

## Manual look (optional)

Start the `desktop-demo` preview from `.claude/launch.json`, open the sample file, choose
**Profile**, and compare the page with the mockup in the spec.

## Full gates before finishing

```bash
app/engine/.venv/Scripts/python.exe -m pytest app/engine/tests
```

```bash
app/engine/.venv/Scripts/python.exe -m ruff check app/engine && app/engine/.venv/Scripts/python.exe -m ruff format --check app/engine
```

```bash
cd app/desktop && npx vitest run && npx tsc --noEmit && npm run test:ui
```

Run `npx prettier --check` on changed desktop files only.
