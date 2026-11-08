"""Patterns: correlations between number columns and value formats of text columns."""

from forma_engine.profiling.tools.common import detected_types
from forma_engine.profiling.tools.correlations import correlations
from forma_engine.profiling.tools.formats import formats


def patterns(context, params: dict) -> dict:
    detected_types(context)  # refuses when there is no profile yet
    return {"correlation": correlations(context), "formats": formats(context)}
