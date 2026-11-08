import type { ColumnProfile, DetectedType, QualityLevel } from '../../../types/profile';

export type ColumnFilter = {
  search: string;
  type: DetectedType | 'all';
  quality: QualityLevel | 'all';
};

export type SortKey =
  | 'position'
  | 'name'
  | 'type'
  | 'completeness'
  | 'unique'
  | 'quality'
  | 'missing';
export type ColumnSort = { key: SortKey; direction: 'ascending' | 'descending' };

const QUALITY_RANK: Record<QualityLevel, number> = { poor: 0, needs_attention: 1, good: 2 };

const value: Record<SortKey, (column: ColumnProfile) => string | number | null> = {
  position: (column) => column.position,
  name: (column) => column.name,
  type: (column) => column.detected_type,
  completeness: (column) => column.completeness,
  unique: (column) => column.unique_count,
  quality: (column) => QUALITY_RANK[column.quality],
  missing: (column) => column.missing_count,
};

export function filterColumns(columns: ColumnProfile[], filter: ColumnFilter) {
  const search = filter.search.trim().toLowerCase();
  return columns.filter(
    (column) =>
      column.name.toLowerCase().includes(search) &&
      (filter.type === 'all' || column.detected_type === filter.type) &&
      (filter.quality === 'all' || column.quality === filter.quality),
  );
}

/** Stable sort; ties keep schema order and a missing completeness always sorts last. */
export function sortColumns(columns: ColumnProfile[], { key, direction }: ColumnSort) {
  const sign = direction === 'ascending' ? 1 : -1;
  return [...columns].sort((a, b) => {
    const [left, right] = [value[key](a), value[key](b)];
    if (left === null || right === null) {
      if (left !== right) return left === null ? 1 : -1;
    } else if (left !== right) {
      const order =
        typeof left === 'string' ? left.localeCompare(String(right)) : left - Number(right);
      return order * sign;
    }
    return a.position - b.position;
  });
}

export const countLabel = (visible: number, total: number) =>
  `${visible === total ? '' : `${visible} of `}${total} ${total === 1 ? 'column' : 'columns'}`;
