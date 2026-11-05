import { useState } from 'react';
import type { QualityBreakdown } from '../../types/profile';
import { ChartTooltip, type Tip } from './charts/ChartTooltip';
import { RingChart, type Segment } from './charts/RingChart';
import { formatPercent, formatPercentWithCount } from './profileFormat';

export function QualityPanel({ quality }: { quality: QualityBreakdown }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const total = quality.total_cells;
  const segments: Segment[] = [
    { label: 'Valid', count: quality.valid_cells, className: 'quality-valid' },
    { label: 'Missing', count: quality.missing_cells, className: 'quality-missing' },
    { label: 'Invalid', count: quality.invalid_cells, className: 'quality-invalid' },
  ];
  const describe = ({ label, count }: Segment) =>
    `${label} ${formatPercentWithCount(count, total)}`;
  const show = (segment: Segment | null) =>
    setTip(segment && { label: segment.label, count: segment.count, total });

  return (
    <section className="profile-panel" aria-label="Data quality" tabIndex={-1}>
      <h3>Data quality</h3>
      <RingChart
        segments={segments}
        total={total}
        label={segments.map(describe).join(', ')}
        onHover={show}
      >
        <strong>{formatPercent(quality.completeness)}</strong>
        <span>Complete</span>
      </RingChart>
      <ChartTooltip tip={tip} />
      <ul className="quality-legend" aria-label="Cell quality">
        {segments.map((segment) => (
          <li
            key={segment.label}
            tabIndex={0}
            onFocus={() => show(segment)}
            onBlur={() => show(null)}
          >
            <span className={`legend-swatch ${segment.className}`} aria-hidden="true" />
            <span>{segment.label}</span>
            <span>{formatPercentWithCount(segment.count, total)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
