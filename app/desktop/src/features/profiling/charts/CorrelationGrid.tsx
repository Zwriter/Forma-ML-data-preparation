const STRENGTHS: [number, string][] = [
  [0.7, 'strong'],
  [0.4, 'moderate'],
  [0.2, 'weak'],
];

/** The FR-041 word for a coefficient. */
export const strengthOf = (r: number) =>
  STRENGTHS.find(([least]) => Math.abs(r) >= least)?.[1] ?? 'none';

/** "0.83 strong", or "—" when the pair shares fewer than 10 valid rows. */
export const correlationText = (r: number | null) =>
  r === null ? '—' : `${r.toFixed(2)} ${strengthOf(r)}`;

/** Correlation matrix as a table: each cell has a word and a shade, never colour alone. */
export function CorrelationGrid({
  columns,
  matrix,
}: {
  columns: string[];
  matrix: (number | null)[][];
}) {
  return (
    // Focusable so keyboard users can scroll a grid wider than its panel.
    <div
      className="tool-table-wrap"
      tabIndex={0}
      role="region"
      aria-label="Correlations, scrollable"
    >
      <table className="tool-table corr-grid" aria-label="Correlations">
        <thead>
          <tr>
            <td />
            {columns.map((name) => (
              <th key={name} scope="col">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {columns.map((name, i) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              {matrix[i].map((r, j) => (
                <td
                  key={columns[j]}
                  className={
                    r === null ? 'corr-empty' : `corr-${strengthOf(r)}${r < 0 ? ' corr-neg' : ''}`
                  }
                >
                  {correlationText(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
