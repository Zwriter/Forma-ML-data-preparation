import { describe, expect, it } from 'vitest';
import { carryVisibleColumns } from '../../../src/features/workspace/visibleColumns';

const columns = (...names: string[]) =>
  names.map((name) => ({ name, type: 'String', nullable: true }));

describe('carryVisibleColumns', () => {
  it('keeps a renamed column in its place', () => {
    expect(carryVisibleColumns(['b', 'a'], columns('a', 'b'), columns('id', 'b'))).toEqual([
      'b',
      'id',
    ]);
  });

  it('keeps hidden columns hidden and shows new ones', () => {
    expect(carryVisibleColumns(['a'], columns('a', 'b'), columns('a', 'b', 'c'))).toEqual([
      'a',
      'c',
    ]);
  });

  it('drops removed columns and brings them back when they return', () => {
    expect(carryVisibleColumns(['a', 'b'], columns('a', 'b'), columns('a'))).toEqual(['a']);
    expect(carryVisibleColumns(['a'], columns('a'), columns('a', 'b'))).toEqual(['a', 'b']);
  });
});
