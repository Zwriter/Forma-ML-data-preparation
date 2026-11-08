/** Axis ticks from 0 in round steps (1, 2, or 5 × 10ⁿ) that reach at least `max`. */
export function niceTicks(max: number, count: number): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = magnitude * ([1, 2, 5].find((nice) => raw / magnitude <= nice) ?? 10);
  const ticks = Math.ceil(max / step);
  // Rounding keeps steps such as 0.1 × 3 from showing as 0.30000000000000004.
  return Array.from({ length: ticks + 1 }, (_, i) => Number((i * step).toPrecision(12)));
}

/** A function mapping `domain` onto `range` linearly. */
export function linearScale([d0, d1]: [number, number], [r0, r1]: [number, number]) {
  const span = d1 - d0;
  return (value: number) => (span === 0 ? r0 : r0 + ((value - d0) / span) * (r1 - r0));
}
