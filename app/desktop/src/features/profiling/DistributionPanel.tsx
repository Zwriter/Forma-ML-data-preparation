import type { ColumnProfile, NumericSummary } from '../../types/profile';
import { VerticalBars } from './charts/VerticalBars';
import { useChartColumn } from './charts/useChartColumn';
import { formatRange, formatValue } from './profileFormat';

/** Date/time spread is in seconds; days read better. */
const formatSpread = (std: number, isDate: boolean) =>
  isDate ? `${formatValue(std / 86_400)} days` : formatValue(std);

export function DistributionPanel({
  historyId,
  columns,
}: {
  historyId: string;
  columns: ColumnProfile[];
}) {
  const eligible = columns.filter((column) => column.numeric);
  const { column, pick } = useChartColumn(
    historyId,
    'distribution',
    eligible,
    (item) => item.unique_count >= 2,
  );
  const numeric = column?.numeric as NumericSummary | undefined;
  const bins = numeric?.histogram ?? [];
  const isDate = column?.detected_type === 'datetime';
  const stats: [string, string][] = numeric
    ? [
        ['Mean', formatValue(numeric.mean)],
        ['Median', formatValue(numeric.median)],
        ['Std. dev.', formatSpread(numeric.std, isDate)],
        ['Min', formatValue(numeric.min)],
        ['Max', formatValue(numeric.max)],
      ]
    : [];

  return (
    <section
      id="profile-distribution-panel"
      className="profile-panel"
      aria-label={column ? `Distribution of ${column.name}` : 'Distribution'}
      tabIndex={-1}
    >
      <div className="profile-panel-heading">
        <h3>Distribution{column ? ` of ${column.name}` : ''}</h3>
        {column && (
          <select
            aria-label="Distribution column"
            value={column.name}
            onChange={(event) => pick(event.target.value)}
          >
            {eligible.map((item) => (
              <option key={item.name}>{item.name}</option>
            ))}
          </select>
        )}
      </div>
      {column ? (
        <>
          <VerticalBars
            label={`${column.name} distribution`}
            items={bins.map((bin) => ({
              label: formatRange(bin.start, bin.end),
              count: bin.count,
            }))}
            total={bins.reduce((sum, bin) => sum + bin.count, 0)}
            labelEvery={Math.max(1, Math.ceil(bins.length / 5))}
            axisLabels={bins.map((bin) => formatValue(bin.start))}
            yLabel="Count"
          />
          <ul className="profile-stats" aria-label="Summary statistics">
            {stats.map(([name, value]) => (
              <li key={name}>
                <span>{name}</span>
                <strong>{value}</strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="profile-panel-note">No number or date columns to chart.</p>
      )}
    </section>
  );
}
