<h1 align="center"><img src="app/desktop/src-tauri/forma-logo-icon.svg" alt="" width="22"> Forma</h1>

**Local-first data preparation for machine learning.**

Forma is an open-source desktop application for exploring, profiling, cleaning, and transforming large datasets through a modern visual interface.

Built with React, TypeScript, Tauri, and Python, Forma helps data scientists and ML engineers prepare datasets without repeatedly writing the same preprocessing scripts.

All processing happens locally. No cloud hosting, Docker, or external backend service is required.

## Vision

Make data preparation faster, more transparent, and reproducible so that more time can be spent developing and evaluating machine learning models.

## Why Forma?

Data preparation is one of the most repetitive parts of machine learning workflows.

Common tasks include:

- Inspecting unfamiliar datasets
- Identifying missing or inconsistent values
- Fixing incorrect data types
- Removing duplicates
- Understanding feature distributions
- Applying transformations
- Preparing training and validation datasets
- Exporting cleaned data

Forma brings these operations into a single desktop workspace.

## Core Features

### Dataset Explorer
- Import CSV and Parquet files
- Browse large datasets using virtualized tables
- Inspect column names and data types
- Filter, sort, and preview records
- Work with multi-gigabyte datasets

### Data Profiling
- Missing-value analysis
- Duplicate detection
- Column statistics
- Numerical distributions
- Categorical frequencies
- Cardinality analysis
- Data quality indicators

### Data Cleaning
- Remove duplicate records
- Fill or remove missing values
- Convert column types
- Rename and drop columns
- Normalize text values
- Filter rows
- Apply configurable transformations

### Reusable Pipelines
- Build ordered cleaning workflows
- Save pipeline configurations
- Replay transformations on new datasets
- Preview transformation results
- Export pipeline definitions

### ML Preprocessing
- Feature selection
- Numerical scaling
- Categorical encoding
- Train/test-aware transformations
- Reproducible preprocessing workflows

### Export
- CSV
- Parquet
- Database integration
- Python preprocessing definitions

## Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop runtime | Tauri 2 |
| Frontend | React + TypeScript |
| Build tooling | Vite |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Data tables | TanStack Table |
| Charts | Apache ECharts |
| Processing engine | Python |
| Data transformations | Polars |
| Analytical queries | DuckDB |
| ML preprocessing | scikit-learn |
| Local metadata | SQLite |
| Python packaging | PyInstaller or Nuitka |

## Architecture Overview

```text
React + TypeScript
        |
        v
    Tauri 2
        |
        v
  Python Sidecar
        |
        v
  Processing Engine
   /           \
Polars        DuckDB
   \           /
    Local Files
```

The frontend handles user interaction and visualization.

Tauri provides the desktop runtime and manages communication with the local Python process.

The Python engine performs data processing, profiling, transformations, and exports.

Large datasets remain in the processing layer rather than being transferred into the frontend.

## Design Principles

1. **Local-first** — Data stays on the user's machine by default.
2. **Non-destructive** — Original datasets remain unchanged.
3. **Responsive** — Long-running operations never block the UI.
4. **Reproducible** — Cleaning pipelines can be saved and replayed.
5. **Scalable** — Prefer lazy and streaming processing for large datasets.
6. **Modular** — The processing engine remains independent of the UI.
7. **Transparent** — Users can inspect transformations and their results.

## License

To be determined.
