<!--
Sync Impact Report
- Version change: unversioned scaffold -> 1.0.0
- Modified principles: template placeholders -> five Forma-specific principles
- Added sections: Architecture and Scope Constraints; Development Workflow and Quality Gates
- Removed sections: none
- Follow-up TODOs: confirm the original ratification date
-->

# Forma Constitution

## Core Principles

### I. SOLID Design Is Mandatory

All production code MUST follow the SOLID principles. Responsibilities MUST be cohesive,
dependencies MUST be abstractions where substitution or isolation is required, and changes
MUST avoid forcing unrelated consumers to depend on unused behavior. Exceptions require a
written rationale in the change review. This keeps the system maintainable as the desktop
application and processing engine grow.

### II. Object-Oriented Backend Design

Backend application code MUST use OOP principles where behavior has state, lifecycle, or
domain responsibility. Classes MUST have clear responsibilities, encapsulation MUST protect
invariants, and inheritance MUST be used only when a true substitutable relationship exists.
The Python engine MUST remain independent of React and Tauri so it can be tested and reused
from scripts, notebooks, and automated workflows.

### III. Backend Test-Driven Development

Backend behavior MUST be developed using TDD: write a focused failing test, implement the
smallest change that makes it pass, then refactor while keeping the test suite green. New
backend behavior, bug fixes, transformation rules, validation rules, and IPC contracts MUST
have automated tests. A change is not complete until its relevant tests pass.

### IV. Modern, Responsive, Usable Frontend

The frontend MUST provide a modern and responsive interface across supported desktop window
sizes. User flows MUST follow established UX principles: clear hierarchy, predictable
navigation, accessible controls, visible operation states, actionable errors, keyboard
support, and no avoidable blocking during processing. Frontend changes MUST be checked at
supported viewport sizes and MUST preserve bounded data transfer from the processing engine.

### V. Small, Reusable, Non-Duplicated Code

Production source files MUST remain at or below 250 lines of code, excluding blank lines and
comments. Shared behavior MUST have one authoritative implementation; duplicated logic MUST
be extracted or deliberately justified in review. Code MUST favor focused modules and simple
composition over oversized files or speculative abstractions. This limit is a design signal,
not permission to split code into meaningless fragments.

## Architecture and Scope Constraints

All application-specific code, configuration, and assets MUST live inside the `app/` folder.
The Python processing engine MUST remain independent of the frontend and Tauri runtime.
Large datasets MUST remain in the processing layer; the frontend MUST receive only bounded
previews, metadata, and aggregates. Processing MUST be local-first, preserve source files by
default, and validate IPC inputs. Backend security configuration MUST include appropriate CORS
configuration for any HTTP-capable local integration.

## Development Workflow and Quality Gates

Every change MUST identify its affected layer and verify the relevant constitution principles.
Backend changes MUST include TDD evidence and pass unit tests; changes crossing the engine,
IPC, or Tauri boundary MUST also include integration or contract coverage. Frontend changes
MUST include responsive and accessibility checks appropriate to the affected workflow. Reviews
MUST reject unexplained duplication, files over the size limit, missing tests for backend
behavior, and UI changes that regress usability or responsiveness.

## Governance
<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

This constitution supersedes conflicting project practices. Amendments MUST update this file,
include a Sync Impact Report, state the reason for the change, and preserve or document any
required migration. Versioning follows semantic versioning: MAJOR for incompatible governance
changes or principle removals, MINOR for new or materially expanded principles or sections,
and PATCH for clarifications and non-semantic wording changes.

Each change review MUST assess compliance with the constitution and record justified
exceptions. The project MUST review this constitution whenever architecture, supported
platforms, testing policy, or quality gates materially change. Unresolved governance gaps
MUST be recorded as explicit TODOs rather than silently ignored.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm original adoption date | **Last Amended**: 2026-10-13
<!-- Example: Version: 2.1.1 | Ratified: 2025-06-13 | Last Amended: 2025-07-16 -->
