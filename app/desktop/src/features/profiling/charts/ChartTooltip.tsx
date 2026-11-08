import { useState } from 'react';
import { formatCountWithPercent } from '../profileFormat';

export type Tip = { label: string; count: number; total: number };
export type BarItem = { label: string; count: number };

/** Shared chart tooltip; charts set it on hover and on keyboard focus. */
export function ChartTooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div className="chart-tooltip" role="tooltip">
      {`${tip.label}: ${formatCountWithPercent(tip.count, tip.total)}`}
    </div>
  );
}

/** Tooltip state plus the props that make a bar focusable, labelled, and tip-showing. */
export function useBarTip(total: number) {
  const [tip, setTip] = useState<Tip | null>(null);
  const bind = (item: BarItem) => ({
    tabIndex: 0,
    'aria-label': `${item.label}: ${formatCountWithPercent(item.count, total)}`,
    onFocus: () => setTip({ ...item, total }),
    onBlur: () => setTip(null),
    onMouseEnter: () => setTip({ ...item, total }),
    onMouseLeave: () => setTip(null),
  });
  return { tip, bind };
}
