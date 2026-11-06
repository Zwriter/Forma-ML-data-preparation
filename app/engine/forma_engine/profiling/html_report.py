"""One self-contained HTML file per profile: inline CSS and SVG, values escaped."""

from html import escape

from forma_engine.profiling.html_charts import hbars_svg, ring_svg, vbars_svg

QUALITY = {"good": "Good", "needs_attention": "Needs attention", "poor": "Poor"}
STYLE = """
body{font-family:'Segoe UI',Arial,sans-serif;color:#17213f;margin:24px;background:#fff}
h1{margin:0 0 4px}.muted{color:#697590}
.cards,.panels{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}
.card{border:1px solid #e0e4ed;padding:10px 14px}
.card strong{display:block;font-size:22px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{border-bottom:1px solid #e0e4ed;padding:6px 8px;text-align:left}
th{background:#f7f8fb}.stats{display:flex;gap:16px;font-size:12px}
.panels section{min-width:0}.panels svg{width:100%;height:auto;max-height:220px}
.panels svg[role=img]{max-width:180px}
@media print{.panels{grid-template-columns:repeat(2,1fr)}}
"""


def _share(count, total):
    return f"{count / total * 100:.1f}%" if total else "—"


def _when(iso: str) -> str:
    """'2026-11-06T16:09:50.49Z' as '2026-11-06 16:09 UTC'."""
    return escape(f"{iso[:16].replace('T', ' ')} UTC")


def _percent(share):
    return "—" if share is None else f"{share * 100:.1f}%"


def _value(value):
    if isinstance(value, float):
        return f"{value:,.2f}"
    return escape(str(value)[:10] if isinstance(value, str) else str(value))


def _pick(columns, name, kind, preferred):
    eligible = [c for c in columns if c[kind]]
    chosen = next((c for c in eligible if c["name"] == name), None)
    return (
        chosen
        or next((c for c in eligible if preferred(c)), None)
        or (eligible[0] if eligible else None)
    )


def _cards(p):
    cards = [
        ("Rows", p["row_count"]),
        ("Columns", p["column_count"]),
        ("Missing cells", p["missing_cells"]),
        ("Duplicate rows", p["duplicate_rows"]),
    ]
    return "".join(
        f'<div class="card"><strong>{value:,}</strong>{label}</div>'
        for label, value in cards
    )


def _quality(q):
    legend = "".join(
        f"<li>{label}: {_share(q[f'{label.lower()}_cells'], q['total_cells'])}"
        f" ({q[f'{label.lower()}_cells']:,})</li>"
        for label in ("Valid", "Missing", "Invalid")
    )
    return f"<h2>Data quality</h2>{ring_svg(q)}<ul>{legend}</ul>"


def _missing(p):
    worst = sorted(
        (c for c in p["columns"] if c["missing_count"]),
        key=lambda c: (-c["missing_count"], c["position"]),
    )[:10]
    bars = hbars_svg([(c["name"], c["missing_count"]) for c in worst], p["row_count"])
    return f"<h2>Missing values by column</h2>{bars}"


def _distribution(column):
    if not column:
        return "<h2>Distribution</h2><p>No number or date columns to chart.</p>"
    n = column["numeric"]
    bins = n["histogram"]
    items = [(_value(b["start"]), b["count"]) for b in bins]
    stats = "".join(
        f"<span>{label}<br><b>{_value(n[key])}</b></span>"
        for label, key in (
            ("Mean", "mean"),
            ("Median", "median"),
            ("Std. dev.", "std"),
            ("Min", "min"),
            ("Max", "max"),
        )
    )
    total = sum(b["count"] for b in bins)
    return (
        f"<h2>Distribution of {escape(column['name'])}</h2>"
        f'{vbars_svg(items, total)}<div class="stats">{stats}</div>'
    )


def _categories(column):
    if not column:
        return "<h2>Categories</h2><p>No text or yes/no columns to chart.</p>"
    c = column["categories"]
    items = [(t["value"], t["count"]) for t in c["top"]]
    if c["other_count"]:
        items.append(("Other", c["other_count"]))
    total = sum(count for _, count in items)
    return f"<h2>{escape(column['name'])} (categorical)</h2>{vbars_svg(items, total)}"


def _table(p):
    head = (
        "".join(
            f"<th>{h}</th>"
            for h in (
                "#",
                "Column",
                "Type",
                "Completeness",
                "Unique",
                "Quality",
                "Missing",
            )
        )
        + "<th>Examples</th>"
    )
    rows = "".join(
        "<tr>"
        f"<td>{c['position']}</td><td>{escape(c['name'])}</td>"
        f"<td>{c['detected_type']}</td>"
        f"<td>{_percent(c['completeness'])}</td>"
        f"<td>{c['unique_count']:,}</td><td>{QUALITY[c['quality']]}</td>"
        f"<td>{c['missing_count']:,}"
        f" ({_share(c['missing_count'], p['row_count'])})</td>"
        f"<td>{escape(', '.join(c['examples']))}</td>"
        "</tr>"
        for c in p["columns"]
    )
    return f"<h2>Columns</h2><table><tr>{head}</tr>{rows}</table>"


def render_report(
    profile: dict,
    title: str,
    distribution_column: str | None = None,
    category_column: str | None = None,
) -> str:
    """The whole report as one HTML string; chart columns default like the dashboard."""
    columns = profile["columns"]
    numeric = _pick(
        columns, distribution_column, "numeric", lambda c: c["unique_count"] >= 2
    )
    categorical = _pick(
        columns, category_column, "categories", lambda c: 2 <= c["unique_count"] <= 50
    )
    return (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        f"<title>Data profile: {escape(title)}</title>"
        f"<style>{STYLE}</style></head><body>"
        f"<h1>Data profile: {escape(title)}</h1>"
        f'<p class="muted">Computed {_when(profile["computed_at"])}</p>'
        f'<div class="cards">{_cards(profile)}</div><div class="panels">'
        f"<section>{_quality(profile['quality'])}</section>"
        f"<section>{_missing(profile)}</section>"
        f"<section>{_distribution(numeric)}</section>"
        f"<section>{_categories(categorical)}</section></div>"
        f"{_table(profile)}</body></html>\n"
    )
