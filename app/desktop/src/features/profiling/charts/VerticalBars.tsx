import { formatCount, formatCountWithPercent } from '../profileFormat';
import { niceTicks } from './chartScale';
import { ChartTooltip, useBarTip, type BarItem } from './ChartTooltip';

/** Vertical bars (histograms, categories) with a count axis; bars are focusable list items. */
export function VerticalBars({
  label,
  items,
  total,
  showValues = false,
  labelEvery = 1,
  axisLabels,
  yLabel,
}: {
  label: string;
  items: BarItem[];
  total: number;
  /** Prints "count (share)" above each bar, for a handful of categories. */
  showValues?: boolean;
  /** Shows every nth x label, so dense histograms stay readable. */
  labelEvery?: number;
  /** Shorter x labels than the bar labels, such as a bin's start value. */
  axisLabels?: string[];
  yLabel?: string;
}) {
  const { tip, bind } = useBarTip(total);
  const ticks = niceTicks(Math.max(0, ...items.map((item) => item.count)), 4);
  const top = ticks.at(-1) || 1;
  const share = (value: number) => `${(value / top) * 100}%`;

  return (
    <div className={labelEvery > 1 ? 'vbars vbars-sparse' : 'vbars'}>
      {yLabel && <span className="vbars-y-label">{yLabel}</span>}
      <div className="vbars-axis" aria-hidden="true">
        {ticks.map((value) => (
          <span key={value} style={{ bottom: share(value) }}>
            {formatCount(value)}
          </span>
        ))}
      </div>
      <ul className="vbars-list" aria-label={label}>
        {items.map((item, index) => (
          <li key={`${index}-${item.label}`} className="vbars-column" {...bind(item)}>
            <span className="vbars-plot">
              <span className="vbars-bar" style={{ height: share(item.count) }}>
                {showValues && (
                  <span className="vbars-value">{formatCountWithPercent(item.count, total)}</span>
                )}
              </span>
            </span>
            <span className="vbars-label" title={item.label}>
              {index % labelEvery === 0 ? (axisLabels?.[index] ?? item.label) : ''}
            </span>
          </li>
        ))}
      </ul>
      <ChartTooltip tip={tip} />
    </div>
  );
}
