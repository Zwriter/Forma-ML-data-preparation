"""Profile ribbon tools: name → fn(context, params) -> dict (see ProfileToolsService).

Each tool phase adds its function here."""

from forma_engine.profiling.tools.column_detail import column_detail
from forma_engine.profiling.tools.distribution_detail import distribution_detail
from forma_engine.profiling.tools.duplicates import duplicates
from forma_engine.profiling.tools.outliers import anomalies
from forma_engine.profiling.tools.patterns import patterns
from forma_engine.profiling.tools.rows import rows
from forma_engine.profiling.tools.suggestions import suggestions

TOOLS: dict = {
    "column_detail": column_detail,
    "rows": rows,
    "distribution": distribution_detail,
    "duplicates": duplicates,
    "patterns": patterns,
    "anomalies": anomalies,
    "suggestions": suggestions,
}
