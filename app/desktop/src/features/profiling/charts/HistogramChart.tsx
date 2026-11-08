import type { HistogramBin } from '../../../types/profile';
import { formatRange, formatValue } from '../profileFormat';
import { VerticalBars } from './VerticalBars';

/** A histogram: one bar per bin, about five start values on the axis, exact ranges in
 *  each bar's label. Shared by the dashboard and the Profile tools. */
export function HistogramChart({
  label,
  bins,
  scale,
}: {
  label: string;
  bins: HistogramBin[];
  scale?: 'linear' | 'log';
}) {
  return (
    <VerticalBars
      label={label}
      items={bins.map((bin) => ({ label: formatRange(bin.start, bin.end), count: bin.count }))}
      total={bins.reduce((sum, bin) => sum + bin.count, 0)}
      labelEvery={Math.max(1, Math.ceil(bins.length / 5))}
      axisLabels={bins.map((bin) => formatValue(bin.start))}
      yLabel="Count"
      scale={scale}
    />
  );
}
