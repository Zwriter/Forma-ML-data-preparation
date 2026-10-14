# Forma MVP Research

## Decision 1: Use an independent Python processing engine

- **Decision**: Place dataset access, profiling, transformations, jobs, and exports in an
  independent Python package under `app/engine/`.
- **Rationale**: The architecture requires reuse from the desktop app, scripts, notebooks,
  and tests. Keeping the engine independent prevents UI concerns from entering data logic and
  supports the constitution's OOP, SOLID, and TDD requirements.
- **Alternatives considered**: Put processing in Tauri commands or the frontend. Rejected
  because it would couple data behavior to the desktop runtime and risk transferring large
  datasets to the UI.

## Decision 2: Use Polars for transformations and DuckDB for analytical profiling

- **Decision**: Use Polars lazy/streaming-compatible operations for dataset transformations
  and DuckDB queries for aggregations and profiling statistics where appropriate.
- **Rationale**: Both tools are already specified by the architecture and support columnar,
  local processing for the 1-5 GB target. Each transformation must still be tested for memory
  behavior and streaming compatibility rather than assuming every operation is streaming-safe.
- **Alternatives considered**: Materialize all data in Python objects or use one engine for
  every operation. Rejected because full-memory objects undermine the dataset-size target and
  a single engine is less suitable for both transformation and analytical query workloads.

## Decision 3: Use newline-delimited JSON for the sidecar contract

- **Decision**: Communicate between Tauri and the Python sidecar using one JSON request or
  response per line on standard input/output. Responses correlate by request ID; asynchronous
  jobs emit independent progress events.
- **Rationale**: This is the documented architecture, requires no local HTTP server, is easy to
  capture in contract tests, and can support bounded payloads and explicit error states.
- **Alternatives considered**: A local HTTP server or direct in-process bindings. Rejected
  because HTTP adds a service lifecycle and port surface, while direct bindings compromise the
  independent sidecar boundary.

## Decision 4: Represent processing as explicit job state

- **Decision**: Long-running profiling, transformation, and export work uses `pending`,
  `running`, `completed`, `failed`, and `cancelled` states. Progress is a nullable value;
  null means indeterminate.
- **Rationale**: The product requirements require responsiveness, understandable status, and
  cooperative cancellation. Explicit states allow the UI to render reliable feedback without
  guessing from elapsed time.
- **Alternatives considered**: A boolean busy flag or percentage-only progress. Rejected
  because neither represents failures, cancellation, or operations with unknown progress.

## Decision 5: Preserve sources and write exports safely

- **Decision**: Never mutate the source by default. Write exports to a temporary destination,
  validate the completed output, and promote it to the requested destination only after success.
  Existing destinations require explicit overwrite confirmation.
- **Rationale**: This directly satisfies non-destructive and interrupted-export requirements and
  prevents a failed operation from appearing complete.
- **Alternatives considered**: Write directly to the requested path or replace the source in
  place. Rejected because partial output and accidental source loss are unacceptable.

## Decision 6: Pin a conservative initial runtime baseline

- **Decision**: Target Python 3.11 for the first implementation, current stable Rust for Tauri,
  and the versions supported by the selected React/Vite toolchain. Record exact dependency
  versions in package manifests during implementation.
- **Rationale**: Python 3.11 provides a stable baseline for the declared data stack while
  keeping the engine broadly reusable. Exact versions belong in implementation manifests rather
  than this outcome-focused design document.
- **Alternatives considered**: Target the newest available Python release immediately. Rejected
  because packaging and native data dependencies need a stable, reproducible baseline first.

## Decision 7: Use layered tests with backend TDD

- **Decision**: Write backend unit tests before implementation, then add integration and IPC
  contract tests for cross-module behavior. Frontend behavior receives component and workflow
  tests, with end-to-end coverage for the import-clean-export path.
- **Rationale**: This follows the constitution and catches errors at the lowest useful layer
  while still proving the desktop boundary works.
- **Alternatives considered**: Rely only on end-to-end tests. Rejected because failures would
  be slower to diagnose and would not adequately test transformation invariants in isolation.

## Resolved Unknowns

- The repository has no existing application code, so no migration or compatibility adapter is
  required.
- The initial target platform is Windows desktop; platform-specific concerns stay inside Tauri.
- The MVP does not persist reusable pipelines or provide database exports; those remain outside
  this feature's scope.

## Decision 8: Use a constrained filter expression grammar

- **Decision**: Row filters accept only column references, literal values, comparison operators
  (`==`, `!=`, `<`, `<=`, `>`, `>=`), null checks, parentheses, and boolean `AND`/`OR`.
- **Rationale**: The MVP needs expressive filtering without allowing pipeline definitions to
  execute arbitrary code. Parsing a small grammar makes validation deterministic and testable.
- **Alternatives considered**: Accept Python expressions or unrestricted SQL. Rejected because
  both create an arbitrary-code or unsafe-query surface inconsistent with the local processing
  security requirements.

## Decision 9: Define explicit missing-value fill strategies

- **Decision**: Support `constant`, `mean`, `median`, and `mode`. Constant requires a value;
  mean and median require numeric columns; mode requires at least one non-missing value.
- **Rationale**: These strategies cover the MVP's common cleaning cases while giving the UI and
  validator an unambiguous parameter contract.
- **Alternatives considered**: Allow a free-form strategy name or silently coerce incompatible
  columns. Rejected because failures must be actionable and reproducible.
