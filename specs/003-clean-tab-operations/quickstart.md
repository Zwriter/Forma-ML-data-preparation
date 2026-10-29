# Quickstart: Clean Tab Operations

## Automated checks

```powershell
cd app/engine
.venv/Scripts/python.exe -m pytest -q
.venv/Scripts/ruff.exe check . ; .venv/Scripts/ruff.exe format --check .

cd ../desktop
npx vitest run
npx tsc --noEmit
npm run format:check

cd ..
./scripts/check_source_limits.ps1
```

## Manual validation (desktop app)

1. Open `app/fixtures/clean-tab-operations.csv` and switch to **Clean**.
2. Ribbon **Fill** → column `TotalCharges`, strategy Median → Add step. The card reads
   "Fill missing values · Column: TotalCharges • Strategy: median".
3. **Add step ▾ → Remove** → Duplicate rows → Add step.
4. **Preview changes**: Before tab marks the missing cell and the duplicate row; After tab marks
   the filled cell; the summary reports rows removed and values filled for the full file.
5. Toggle step 2 off → preview shows "out of date"; Apply button reads "Apply 1 step".
6. Step 1 menu → Move down, Duplicate, Delete; numbering updates; keyboard-only works (Tab,
   Enter/Space, arrow keys in the menu, Escape to close).
7. Add **Split** on `full_name` with separator space into `first_name`, `last_name`; **Merge**
   `city`, `country` with `, ` into `location`; **Convert** `SeniorCitizen` to whole number.
8. **Apply N steps** → running state, then the Data tab shows the result and the title bar marks
   unsaved changes. **Ctrl+Z** reverts all applied steps at once; **Ctrl+X** restores them.
9. Configure a step referencing a column removed by an earlier step → that step shows an error;
   Preview and Apply are disabled.
10. Resize to 800 px wide: the step list stacks above the preview with no horizontal scroll.
