# Forma MVP Quickstart Validation

This guide validates the import-clean-export workflow after implementation. It is intentionally
an execution guide, not an implementation design. See [data-model.md](data-model.md) for
entities and [contracts/ipc.md](contracts/ipc.md) for message schemas.

## Prerequisites

- Windows development machine with the supported Python, Node.js, Rust, and Tauri toolchains.
- A clean checkout of the repository.
- A writable temporary directory.
- A representative CSV or Parquet fixture under `app/fixtures/`, including a file large enough
  to exercise bounded preview behavior.

## Setup

From the repository root:

```powershell
Set-Location app/engine
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"

Set-Location ..\frontend\desktop
npm install
```

The exact package commands may be adjusted when manifests are created, but setup must produce a
runnable engine test environment and a runnable desktop development environment.

## Backend Test-First Checks

From `app/engine`:

```powershell
python -m pytest tests/unit tests/contract tests/integration
```

Expected outcomes:

- Readers accept valid CSV and Parquet files and reject unsupported or invalid files.
- Preview responses respect offset and maximum limit.
- Profile reports distinguish zero, unknown, and pending values.
- Each transformation validates parameters and preserves the last valid result on failure.
- Jobs transition through valid states and respond to cooperative cancellation.
- Export tests verify source-file integrity, overwrite confirmation, output validation, and
  interrupted-export behavior.
- IPC contract tests validate request correlation, bounded responses, error codes, and events.

## Desktop Workflow Check

From `app/frontend/desktop`:

```powershell
npm test
npm run build
```

Expected outcomes:

- Component and state tests cover loading, empty, error, running, completed, and cancelled UI
  states.
- The build succeeds without source files exceeding the constitution's 250-line limit.
- Keyboard navigation and accessible names exist for file selection, transformation, cancellation,
  comparison, and export controls.

## End-to-End Scenario

1. Launch the desktop application.
2. Open a valid CSV fixture and verify schema and bounded preview records.
3. Request profiling and verify the operation state and resulting quality statistics.
4. Configure duplicate removal and missing-value handling.
5. Preview the before and after result without committing an invalid operation.
6. Apply the valid transformations and verify the source file timestamp and contents remain
   unchanged.
7. Export once as CSV and once as Parquet to new destinations.
8. Reopen both outputs and verify schema and records match the cleaned result.
9. Attempt an invalid conversion, an overwrite without confirmation, and a cancelled export.
10. Verify each failure is actionable and no incomplete export is reported as completed.

## Acceptance Evidence

Record the following for the implementation review:

- Test command output and environment versions.
- Fixture sizes and measured preview response behavior.
- Evidence that the original source file was not modified.
- Successful reopen and schema comparison for both output formats.
- Screenshots or test evidence for responsive loading, error, progress, cancellation, and
  keyboard-accessible states.
