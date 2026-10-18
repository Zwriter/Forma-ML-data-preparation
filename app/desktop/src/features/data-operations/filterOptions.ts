import type { Column } from '../../types/dataset';
import type { FilterOperator } from '../../types/dataOperations';

const textOperators: FilterOperator[] = [
  'equals',
  'not_equals',
  'contains',
  'begins_with',
  'ends_with',
  'is_empty',
  'is_not_empty',
];
const numericOperators: FilterOperator[] = [
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'at_least',
  'at_most',
  'is_empty',
  'is_not_empty',
];

export const filterOperatorLabels: Record<FilterOperator, string> = {
  equals: 'is',
  not_equals: 'is not',
  contains: 'contains',
  begins_with: 'begins with',
  ends_with: 'ends with',
  greater_than: 'greater than',
  less_than: 'less than',
  at_least: 'at least',
  at_most: 'at most',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
};

function columnType(columns: Column[], name: string) {
  return columns.find((column) => column.name === name)?.type.toLowerCase() ?? '';
}

export function filterOperatorsFor(columns: Column[], name: string): FilterOperator[] {
  const type = columnType(columns, name);
  if (/int|float|double|decimal/.test(type)) return numericOperators;
  if (type.includes('date')) return [...numericOperators.slice(0, 6), 'is_empty', 'is_not_empty'];
  if (type.includes('bool')) return ['equals', 'not_equals', 'is_empty', 'is_not_empty'];
  return textOperators;
}

export function filterInputType(columns: Column[], name: string): string {
  const type = columnType(columns, name);
  if (/int|float|double|decimal/.test(type)) return 'number';
  if (type.includes('date')) return 'date';
  return 'text';
}
