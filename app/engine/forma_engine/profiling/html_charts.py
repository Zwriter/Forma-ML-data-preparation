"""Inline SVG charts for the offline HTML report. Values are escaped; nothing is linked.

The dashboard draws the same charts in React; only the drawing is repeated here because
the report must open without Forma (see plan.md Complexity Tracking)."""

from html import escape
from math import pi

PURPLE = "#8b2fba"
COLORS = {"Valid": "#1e8e4f", "Missing": "#9aa3b5", "Invalid": "#c4314b"}


def _share(count: int, total: int) -> str:
    return f"{count / total * 100:.1f}%" if total else "—"


def _tip(label: str, count: int, total: int) -> str:
    return f"<title>{escape(label)}: {count:,} ({_share(count, total)})</title>"


def ring_svg(quality: dict) -> str:
    total, radius = quality["total_cells"], 42
    circumference = 2 * pi * radius
    centre = quality["completeness"]
    parts, offset = [], 0.0
    for label in ("Valid", "Missing", "Invalid"):
        count = quality[f"{label.lower()}_cells"]
        length = count / total * circumference if total else 0
        parts.append(
            f'<circle cx="50" cy="50" r="{radius}" fill="none" stroke="{COLORS[label]}"'
            f' stroke-width="12" stroke-dasharray="{length:.2f} {circumference:.2f}"'
            f' stroke-dashoffset="{-offset:.2f}" transform="rotate(-90 50 50)">'
            f"{_tip(label, count, total)}</circle>"
        )
        offset += length
    text = f"{centre * 100:.1f}%" if centre is not None else "—"
    return (
        '<svg viewBox="0 0 100 100" width="160" height="160" role="img">'
        '<circle cx="50" cy="50" r="42" fill="none" stroke="#e6e8ef"'
        ' stroke-width="12"/>'
        + "".join(parts)
        + f'<text x="50" y="54" text-anchor="middle" font-size="14">{text}</text></svg>'
    )


def _empty(width: int, height: int) -> str:
    return (
        f'<svg viewBox="0 0 {width} {height}" width="{width}" height="{height}">'
        f'<text x="{width / 2}" y="{height / 2}" text-anchor="middle">'
        "No data</text></svg>"
    )


def hbars_svg(items: list[tuple[str, int]], total: int) -> str:
    """One row per item: label, bar scaled to the largest value, count and share."""
    if not items:
        return _empty(340, 40)
    top, row, bar_width = max(count for _, count in items) or 1, 20, 150
    rows = []
    for i, (label, count) in enumerate(items):
        y, width = i * row, count / top * bar_width
        rows.append(
            f'<g><text x="96" y="{y + 14}" text-anchor="end">{escape(label)}</text>'
            f'<rect x="104" y="{y + 4}" width="{width:.2f}" height="12"'
            f' fill="{PURPLE}">'
            f"{_tip(label, count, total)}</rect>"
            f'<text x="{110 + width:.2f}" y="{y + 14}">'
            f"{count:,} ({_share(count, total)})"
            "</text></g>"
        )
    height = len(items) * row
    return (
        f'<svg viewBox="0 0 340 {height}" width="340" height="{height}" font-size="11">'
        + "".join(rows)
        + "</svg>"
    )


def vbars_svg(items: list[tuple[str, int]], total: int) -> str:
    """Columns scaled to the largest value, with each item's label underneath."""
    if not items:
        return _empty(460, 180)
    top, plot, width = max(count for _, count in items) or 1, 150, 460
    step = width / len(items)
    bars = []
    for i, (label, count) in enumerate(items):
        height = count / top * plot
        x = i * step + 1
        bars.append(
            f'<rect x="{x:.2f}" y="{plot - height:.2f}" width="{step - 2:.2f}"'
            f' height="{height:.2f}" fill="{PURPLE}">{_tip(label, count, total)}</rect>'
        )
        if len(items) <= 12 or i % max(1, len(items) // 6) == 0:
            bars.append(
                f'<text x="{x + step / 2:.2f}" y="{plot + 14}" text-anchor="middle">'
                f"{escape(label)}</text>"
            )
    return (
        f'<svg viewBox="0 0 {width} {plot + 20}" width="{width}" height="{plot + 20}"'
        ' font-size="10">' + "".join(bars) + "</svg>"
    )
