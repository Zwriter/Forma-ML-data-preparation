import type { BoxSummary } from '../../../types/profileTools';
import { formatCount, formatValue } from '../profileFormat';

const WIDTH = 400;
const PAD = 8;

/** Dates arrive as ISO text; everything is placed on one numeric axis. */
const toNumber = (value: number | string) =>
  typeof value === 'string' ? Date.parse(value) : value;

export function describeBox(box: BoxSummary) {
  return (
    `Q1 ${formatValue(box.q1)}, median ${formatValue(box.median)}, Q3 ${formatValue(box.q3)}, ` +
    `whiskers ${formatValue(box.lower_whisker)} to ${formatValue(box.upper_whisker)}, ` +
    `${formatCount(box.outliers)} outliers`
  );
}

/** A horizontal box plot from the five summary values (FR-039). */
export function BoxPlot({ box }: { box: BoxSummary }) {
  const low = toNumber(box.lower_whisker);
  const high = toNumber(box.upper_whisker);
  const span = high - low || 1;
  const x = (value: number | string) => PAD + ((toNumber(value) - low) / span) * (WIDTH - 2 * PAD);
  return (
    <figure className="box-plot">
      {/* Stretches to the chart width; strokes keep their width (vector-effect in CSS). */}
      <svg
        viewBox={`0 0 ${WIDTH} 44`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Box plot: ${describeBox(box)}`}
      >
        <line
          className="box-whisker"
          x1={x(box.lower_whisker)}
          x2={x(box.upper_whisker)}
          y1={22}
          y2={22}
        />
        <line
          className="box-whisker"
          x1={x(box.lower_whisker)}
          x2={x(box.lower_whisker)}
          y1={14}
          y2={30}
        />
        <line
          className="box-whisker"
          x1={x(box.upper_whisker)}
          x2={x(box.upper_whisker)}
          y1={14}
          y2={30}
        />
        <rect
          className="box-body"
          x={x(box.q1)}
          y={8}
          width={Math.max(1, x(box.q3) - x(box.q1))}
          height={28}
        />
        <line className="box-median" x1={x(box.median)} x2={x(box.median)} y1={8} y2={36} />
      </svg>
      <figcaption>{describeBox(box)}</figcaption>
    </figure>
  );
}
