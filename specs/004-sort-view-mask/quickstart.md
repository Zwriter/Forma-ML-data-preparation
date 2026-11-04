# Quickstart: Sort as a Persistent View Mask

## Automated checks

```powershell
cd app/engine; .venv/Scripts/python.exe -m pytest; .venv/Scripts/python.exe -m ruff check .; .venv/Scripts/python.exe -m ruff format --check .
cd ../desktop; npx vitest run; npm run test:ui; npx tsc --noEmit
cd ../..; ./app/scripts/check_source_limits.ps1
```

## Manual walkthrough (desktop app with the engine)

1. Open `app/fixtures/clean-tab-operations.csv`; sort by `city` descending. Headers show the
   direction and priority; the file shows unsaved changes.
2. Undo: stored order returns. Redo: sorted again.
3. In Clean, add "Fill missing values → Previous value" on `TotalCharges`; each filled cell
   shows the value of the row above it in the file, displayed in sorted order.
4. Save (copy). The copy's rows are in stored order. Close and reopen the source file: the sort
   is active and nothing is marked unsaved.
5. Sort again only, then Save: no new file is written.
6. Rename `city` in Clean and apply: the sort follows the new name. Remove it: the key drops.
