# Forma MVP validation

Validation run on Windows, 2026-10-14, from the checked out workspace.

## Environment

- Python 3.13.16
- Polars 2.0.0
- Node.js 26.11.1
- npm 11.5.2
- Vitest 2.1.9, Vite 5.4.21

## Results

- Backend: `python -m pytest -q tests/unit tests/contract tests/integration tests/performance` — **77 passed** (6.79s).
- Frontend: `npm test` — **7 files, 12 tests passed** (5.06s).
- Frontend production build: `npm run build` — TypeScript check and Vite production bundle passed.
- Source constraints: `powershell -NoProfile -ExecutionPolicy Bypass -File app/scripts/check_source_limits.ps1` — passed.
- The large-preview performance test generates a lazy one-billion-row expression, requests 500 rows after offset 1,000, asserts the response stays at 500 rows with unknown total count, and enforces a 5-second ceiling. It passed in the backend suite.
- Frontend workflow tests mock Tauri IPC; they cover import, preview, cleaning, and export UI flow. The native Tauri application was not launched.

The Tauri Rust shell could not be compiled or launched in this environment because `rustc` is unavailable. Native sidecar startup, OS-level file permissions, and native window accessibility therefore remain unverified. The Python and frontend validation above ran successfully.

## Source preservation

The engine opens input datasets through lazy readers and writes exports to temporary destinations before validating and promoting them. Integration tests cover source byte preservation and export validation/cancellation cleanup. The test suite passed these checks.
