import type { ReactNode } from 'react';

export type Segment = { label: string; count: number; className: string };

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Donut chart drawn with dashed circle strokes, so no arc maths is needed. */
export function RingChart({
  segments,
  total,
  label,
  children,
  onHover,
}: {
  segments: Segment[];
  total: number;
  label: string;
  children: ReactNode;
  onHover: (segment: Segment | null) => void;
}) {
  let offset = 0;
  return (
    <div className="ring-chart">
      <svg viewBox="0 0 100 100" role="img" aria-label={label}>
        <circle className="ring-track" cx="50" cy="50" r={RADIUS} />
        {total > 0 &&
          segments.map((segment) => {
            const length = (segment.count / total) * CIRCUMFERENCE;
            const start = offset;
            offset += length;
            return (
              <circle
                key={segment.label}
                data-segment={segment.label}
                className={`ring-segment ${segment.className}`}
                cx="50"
                cy="50"
                r={RADIUS}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-start}
                onMouseEnter={() => onHover(segment)}
                onMouseLeave={() => onHover(null)}
              />
            );
          })}
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}
