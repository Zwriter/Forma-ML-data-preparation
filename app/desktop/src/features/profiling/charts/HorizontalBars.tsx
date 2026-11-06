import { formatCount, formatCountWithPercent } from '../profileFormat';
import { niceTicks } from './chartScale';
import { ChartTooltip, useBarTip, type BarItem } from './ChartTooltip';

/** Labelled horizontal bars with a count axis; each bar is a focusable list item. */
export function HorizontalBars({
  label,
  items,
  total,
}: {
  label: string;
  items: BarItem[];
  total: number;
}) {
  const { tip, bind } = useBarTip(total);
  const ticks = niceTicks(Math.max(0, ...items.map((item) => item.count)), 4);
  const top = ticks.at(-1) || 1;
  const share = (value: number) => `${(value / top) * 100}%`;

  return (
    <div className="hbars">
      <ul className="hbars-list" aria-label={label}>
        {items.map((item) => (
          <li key={item.label} className="hbars-row" {...bind(item)}>
            <span className="hbars-label" title={item.label}>
              {item.label}
            </span>
            <span className="hbars-track">
              <span className="hbars-bar" style={{ width: share(item.count) }} />
            </span>
            <span className="hbars-value">{formatCountWithPercent(item.count, total)}</span>
          </li>
        ))}
      </ul>
      <div className="hbars-axis" aria-hidden="true">
        {ticks.map((value) => (
          <span key={value} style={{ left: share(value) }}>
            {formatCount(value)}
          </span>
        ))}
      </div>
      <ChartTooltip tip={tip} />
    </div>
  );
}
