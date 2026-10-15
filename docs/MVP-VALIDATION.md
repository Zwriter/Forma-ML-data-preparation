# Forma MVP validation

Validation run on Windows, 2026-10-14, from the checked out workspace.

## Environment

- Python 3.13.16
- Polars 2.0.0
- Node.js 26.11.1
- npm 11.20.0
- Vitest 2.1.9, Vite 5.4.21

## Results

- Backend: `python -m pytest -q tests/unit tests/contract tests/integration tests/performance` — **104 passed** (2.82s).
- Frontend: `vitest run --pool=forks --maxWorkers=1 --minWorkers=1` — **7 files, 26 tests passed** (7.50s).
- Frontend formatting: `npm run format:check` — TypeScript, TSX, and JSON files passed Prettier 3.6.2.
- Frontend production build: `npm run build` — TypeScript check and Vite production bundle passed.
- Engine lint: `ruff check .` — passed with Ruff 0.17.0.
- Engine formatting: `ruff format --check .` — **55 files already formatted**.
- Source constraints: `powershell -NoProfile -ExecutionPolicy Bypass -File app/scripts/check_source_limits.ps1` — passed after formatting.
- Filter security regression: validator rejects direct calls to the parser's quoted-column helper, alongside malformed filters, unknown columns, unsupported operators, and executable expressions.
- The large-preview performance test generates a lazy one-billion-row expression, requests 500 rows after offset 1,000, asserts the response stays at 500 rows with unknown total count, and enforces a 5-second ceiling. It passed in the backend suite.
- Frontend workflow tests mock Tauri IPC; they cover import, preview, cleaning, and export UI flow. The native Tauri application was not launched.

The Tauri Rust shell could not be compiled or launched in this environment because `rustc` is unavailable. Native sidecar startup, OS-level file permissions, and native window accessibility therefore remain unverified. Frontend workflow and accessibility checks use mocked IPC; the Python integration suite validates engine file behavior.

## Source preservation

The engine opens input datasets through lazy readers and writes exports to temporary destinations before validating and promoting them. Integration tests cover source byte preservation and export validation/cancellation cleanup. The test suite passed these checks.

## Constitution alignment review

Reviewed 2026-10-15 after clarifying that source-size limits apply after normal formatting and
must not be met through minification or compressed statements.

- Prettier: `npm run format:check` passed for TypeScript, TSX, CSS, and JSON.
- Frontend build: `npm run build` passed after formatting the CSS and TypeScript changes.
- Source constraints: `app/scripts/check_source_limits.ps1` passed with CSS included in source
  size checks.
- Python audit: all 38 production files parsed; no lines exceeded 88 characters and no physical
  line contained multiple Python statements.
- Ruff could not be rerun in this workspace because it is not installed in the active Python
  environment. The configuration selects Ruff's `E501` line-length rule.
