import { describe, expect, it } from 'vitest';
import { parseCsv } from '../../../src/services/demoData';

describe('browser demo CSV', () => {
  it('infers columns and preserves quoted commas and escaped quotes', () => {
    const parsed = parseCsv('name,amount\n"Notebook, ruled",12\n"A ""special"" pen",');

    expect(parsed.dataset.format).toBe('csv');
    expect(parsed.dataset.rows).toBe(2);
    expect(parsed.dataset.schema).toEqual([
      { name: 'name', type: 'String', nullable: false },
      { name: 'amount', type: 'Float64', nullable: true },
    ]);
    expect(parsed.records).toEqual([
      { name: 'Notebook, ruled', amount: '12' },
      { name: 'A "special" pen', amount: '' },
    ]);
  });
});
