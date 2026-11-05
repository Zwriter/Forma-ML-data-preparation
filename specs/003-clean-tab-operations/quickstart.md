# Quickstart: Clean Tab Operations

## Automated checks

```powershell
cd app/engine
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/ruff.exe check . ; .venv/Scripts/ruff.exe format --check .

cd ../desktop
npx vitest run
npm run test:ui        # Playwright: layout, scrolling, responsive widths, keyboard (demo build)
npx tsc --noEmit
npm run format:check   # on a CRLF Windows checkout, run `npx prettier --check <changed files>` instead

cd ..
./scripts/check_source_limits.ps1
```

## Manual validation (desktop app)

1. Open `app/fixtures/clean-tab-operations.csv`. In **Data**, hide `SeniorCitizen`, search
   `Romania`, and select a cell; then switch to **Clean**. The same worksheet shows the same
   columns, search, page, and selected cell, with no steps panel yet.
2. Ribbon **Fill** → column `TotalCharges`, strategy Median → Add step. The steps panel opens on
   the right; the card reads "Fill missing values · Column: TotalCharges • Strategy: median"; the
   filled cell is marked in the worksheet without pressing anything else.
3. **Add step ▾ → Remove** → Duplicate rows → Add step. The duplicate row stays in place, struck
   through and labelled Removed. No footer or summary appears: the worksheet is as tall as in
   Data, and Cancel and Apply sit at the bottom of the steps panel.
4. Collapse the panel → it becomes an edge tab showing "2 steps"; the worksheet uses the width;
   reopen it from the keyboard.
5. Toggle step 2 off → the worksheet updates at once and the duplicate row is no longer marked;
   Apply button reads "Apply 1 step".
6. Step 1 menu → Move down, Duplicate, Delete; numbering updates; keyboard-only works (Tab,
   Enter/Space, arrow keys in the menu, Escape to close).
7. Add **Split** on `full_name` with separator space into `first_name`, `last_name`; **Merge**
   `city`, `country` with `, ` into `location`; **Convert** `SeniorCitizen` to whole number.
8. **Apply N steps** → running state, then the Data tab shows the result and the title bar marks
   unsaved changes. **Ctrl+Z** reverts all applied steps at once; **Ctrl+X** restores them.
9. Configure a step referencing a column removed by an earlier step → that step shows an error,
   the worksheet shows the unchanged data, and Apply is disabled.
10. Switch back to **Data**: the columns, search, page, and selected cell are as left in Clean.
11. Resize to 800 px wide: the steps panel opens as an overlay that collapses to an edge tab;
    the page never scrolls horizontally.
