"""Suggestions: recommended fixes and new columns, as one tool call."""

from forma_engine.profiling.tools.creations import creations
from forma_engine.profiling.tools.recommendations import recommendations


def suggestions(context, params: dict) -> dict:
    return {
        "recommendations": recommendations(context),
        "creations": creations(context),
    }
