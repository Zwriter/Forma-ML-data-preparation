import { formatCountWithPercent } from '../profileFormat';

export type Tip = { label: string; count: number; total: number };

/** Shared chart tooltip; charts set it on hover and on keyboard focus. */
export function ChartTooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div className="chart-tooltip" role="tooltip">
      {`${tip.label}: ${formatCountWithPercent(tip.count, tip.total)}`}
    </div>
  );
}
