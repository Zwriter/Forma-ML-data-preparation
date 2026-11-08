import { describe, expect, it } from 'vitest';
import { linearScale, niceTicks } from '../../../src/features/profiling/charts/chartScale';

describe('niceTicks', () => {
  it('picks round steps of 1, 2, or 5 that cover the maximum', () => {
    expect(niceTicks(1521, 4)).toEqual([0, 500, 1000, 1500, 2000]);
    expect(niceTicks(3875, 4)).toEqual([0, 1000, 2000, 3000, 4000]);
    expect(niceTicks(7, 4)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(1, 4)).toEqual([0, 0.5, 1]);
  });

  it('gives a single tick for an empty chart', () => {
    expect(niceTicks(0, 4)).toEqual([0]);
  });
});

describe('linearScale', () => {
  it('maps a domain onto a range, including reversed ranges', () => {
    const x = linearScale([0, 2000], [0, 200]);
    expect(x(500)).toBe(50);
    const y = linearScale([0, 100], [180, 0]);
    expect(y(25)).toBe(135);
  });

  it('maps a zero-width domain to the start of the range', () => {
    expect(linearScale([5, 5], [10, 20])(5)).toBe(10);
  });
});
