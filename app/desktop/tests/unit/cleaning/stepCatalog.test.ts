import { describe, expect, it } from 'vitest';
import {
  ribbonStepTypes,
  stepCatalog,
  summarizeStep,
} from '../../../src/features/cleaning/stepCatalog';
import type { StepType } from '../../../src/types/cleaning';

const columns = [
  { name: 'city', type: 'String', nullable: true },
  { name: 'country', type: 'String', nullable: true },
];

describe('step catalog', () => {
  it('describes all nine step types with a title, icon, and defaults', () => {
    expect(Object.keys(stepCatalog).sort()).toEqual(
      [
        'convert_type',
        'drop_columns',
        'drop_duplicates',
        'drop_null_rows',
        'fill_null',
        'merge_columns',
        'rename_columns',
        'replace_values',
        'split_column',
      ].sort(),
    );
    for (const definition of Object.values(stepCatalog)) {
      expect(definition.title).toBeTruthy();
      expect(definition.icon).toBeTruthy();
      expect(definition.defaults(columns)).toBeTypeOf('object');
    }
  });

  it('maps every Clean ribbon command to a step type', () => {
    expect(ribbonStepTypes).toEqual({
      Convert: 'convert_type',
      Replace: 'replace_values',
      Fill: 'fill_null',
      Split: 'split_column',
      Merge: 'merge_columns',
      Remove: 'drop_duplicates',
      Rename: 'rename_columns',
    });
  });

  it('prefills defaults from the dataset columns', () => {
    expect(stepCatalog.fill_null.defaults(columns)).toMatchObject({ column: 'city' });
    expect(stepCatalog.merge_columns.defaults(columns)).toMatchObject({
      columns: ['city', 'country'],
    });
    expect(stepCatalog.convert_type.defaults([])).toMatchObject({ column: '', on_error: 'fail' });
  });

  it.each([
    [
      'fill_null',
      { column: 'TotalCharges', strategy: 'median' },
      'Column: TotalCharges • Strategy: median',
    ],
    [
      'fill_null',
      { column: 'x', strategy: 'constant', value: 0 },
      'Column: x • Strategy: constant • Value: 0',
    ],
    [
      'replace_values',
      { columns: ['a', 'b'], find: 'N/A', replace: null },
      'Columns: a, b • Find: "N/A" • Replace with: missing',
    ],
    ['convert_type', { column: 'x', to: 'integer' }, 'Column: x • To: integer'],
    [
      'split_column',
      { column: 'name', separator: ' ', into: ['first', 'last'] },
      'Column: name • Separator: " " • Into: first, last',
    ],
    [
      'merge_columns',
      { columns: ['city', 'country'], separator: ', ', into: 'place' },
      'Columns: city, country • Separator: ", " • Into: place',
    ],
    ['drop_duplicates', {}, 'Compare: all columns'],
    ['drop_null_rows', { columns: ['x'] }, 'Columns: x'],
    ['drop_columns', { columns: ['x', 'y'] }, 'Columns: x, y'],
    ['rename_columns', { mapping: { a: 'b' } }, 'a → b'],
  ] as [StepType, Record<string, unknown>, string][])(
    'summarizes %s settings on one line',
    (type, parameters, summary) => {
      expect(summarizeStep({ id: 's', type, parameters, enabled: true })).toBe(summary);
    },
  );
});
