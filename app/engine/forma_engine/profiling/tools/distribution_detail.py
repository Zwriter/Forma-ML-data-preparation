"""Distribution explorer: a histogram with a chosen bar count and a box plot."""

from dataclasses import asdict

from forma_engine.profiling.distributions import histogram
from forma_engine.profiling.tools.common import box_summary, detected_types, shown

BOX_VALUES = ("q1", "median", "q3", "lower_whisker", "upper_whisker")


def distribution_detail(context, params: dict) -> dict:
    name, bins = params["column"], params["bins"]
    kind = detected_types(context)[name]
    frame, token = context.frame, context.token
    dtype = frame.collect_schema()[name]
    box = box_summary(frame, name, kind, dtype, token)  # refuses non-number columns
    found = histogram(frame, name, kind, dtype, token, bins=bins) or []
    return {
        "column": name,
        "bins": [asdict(item) for item in found],
        "box": box
        and {
            **{key: shown(box[key], kind) for key in BOX_VALUES},
            "outliers": box["outliers"],
        },
    }
