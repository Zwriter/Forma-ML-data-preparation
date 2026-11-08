import { describe, expect, it } from 'vitest';
import {
  formatCount,
  formatCountWithPercent,
  formatPercent,
  formatPercentWithCount,
  formatUpdated,
} from '../../../src/features/profiling/profileFormat';

describe('profileFormat', () => {
  it('groups thousands', () => {
    expect(formatCount(7043)).toBe('7,043');
    expect(formatCount(0)).toBe('0');
  });

  it('shows one decimal for shares and a dash for no value', () => {
    expect(formatPercent(0.968)).toBe('96.8%');
    expect(formatPercent(1)).toBe('100.0%');
    expect(formatPercent(null)).toBe('—');
  });

  it('combines a count with its share of a total', () => {
    expect(formatCountWithPercent(1521, 7043)).toBe('1,521 (21.6%)');
    expect(formatCountWithPercent(0, 0)).toBe('0 (—)');
    expect(formatPercentWithCount(3218, 147903)).toBe('2.2% (3,218)');
  });

  it('says Today or Yesterday before the time', () => {
    const now = new Date(2026, 10, 5, 18, 0);
    expect(formatUpdated(new Date(2026, 10, 5, 10, 24).toISOString(), now)).toBe('Today 10:24 AM');
    expect(formatUpdated(new Date(2026, 10, 4, 22, 5).toISOString(), now)).toBe(
      'Yesterday 10:05 PM',
    );
    expect(formatUpdated(new Date(2026, 9, 30, 9, 0).toISOString(), now)).toBe('Oct 30, 9:00 AM');
  });
});
