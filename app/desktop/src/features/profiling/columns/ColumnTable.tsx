import type { ReactNode } from 'react';
import type { OptionalColumn } from '../../../stores/profileStore';
import type { ColumnProfile, DetectedType, QualityLevel } from '../../../types/profile';
import { formatCount, formatCountWithPercent, formatPercent } from '../profileFormat';
import type { ColumnSort, SortKey } from './columnTableModel';

export const TYPES: Record<DetectedType, [tag: string, label: string]> = {
  text: ['Abc', 'Text'],
  integer: ['123', 'Integer'],
  decimal: ['1.2', 'Decimal'],
  datetime: ['Date', 'Date/time'],
  boolean: ['T/F', 'Boolean'],
  other: ['?', 'Other'],
};

export const QUALITY_LABELS: Record<QualityLevel, string> = {
  good: 'Good',
  needs_attention: 'Needs attention',
  poor: 'Poor',
};

type Header = { label: string; sortKey?: SortKey; optional?: OptionalColumn };
const HEADERS: Header[] = [
  { label: '#', sortKey: 'position' },
  { label: 'Column name', sortKey: 'name' },
  { label: 'Type', sortKey: 'type', optional: 'type' },
  { label: 'Completeness', sortKey: 'completeness', optional: 'completeness' },
  { label: 'Unique values', sortKey: 'unique', optional: 'unique' },
  { label: 'Quality', sortKey: 'quality', optional: 'quality' },
  { label: 'Missing', sortKey: 'missing', optional: 'missing' },
  { label: 'Examples', optional: 'examples' },
];
/** Counts read best largest-first; names, types and quality (worst first) ascending. */
const DESCENDING_FIRST: SortKey[] = ['completeness', 'unique', 'missing'];

type Props = {
  columns: ColumnProfile[];
  rowCount: number;
  sort: ColumnSort;
  hidden: OptionalColumn[];
  onSort: (sort: ColumnSort) => void;
  onClearFilters: () => void;
  rowMenu: (column: ColumnProfile) => ReactNode;
};

export function ColumnTable({
  columns,
  rowCount,
  sort,
  hidden,
  onSort,
  onClearFilters,
  rowMenu,
}: Props) {
  const headers = HEADERS.filter((header) => !header.optional || !hidden.includes(header.optional));
  const shown = (column: OptionalColumn) => !hidden.includes(column);

  function toggle(key: SortKey) {
    if (key === sort.key)
      onSort({ key, direction: sort.direction === 'ascending' ? 'descending' : 'ascending' });
    else onSort({ key, direction: DESCENDING_FIRST.includes(key) ? 'descending' : 'ascending' });
  }

  if (!columns.length)
    return (
      <div className="profile-table-empty">
        <p>No columns match</p>
        <button type="button" onClick={onClearFilters}>
          Clear filters
        </button>
      </div>
    );

  return (
    <div className="profile-table-wrap">
      <table className="profile-table" aria-label="Column profiles">
        <thead>
          <tr>
            {headers.map(({ label, sortKey }) => (
              <th
                key={label}
                scope="col"
                aria-sort={
                  sortKey && sort.key === sortKey ? sort.direction : sortKey ? 'none' : undefined
                }
              >
                {sortKey ? (
                  <button type="button" onClick={() => toggle(sortKey)}>
                    {label}
                    {sort.key === sortKey && (
                      <span aria-hidden="true">{sort.direction === 'ascending' ? ' ↑' : ' ↓'}</span>
                    )}
                  </button>
                ) : (
                  label
                )}
              </th>
            ))}
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {columns.map((column) => (
            <tr key={column.name}>
              <td>{column.position}</td>
              <td className="profile-cell-name" title={column.name}>
                {column.name}
              </td>
              {shown('type') && (
                <td>
                  <span className="type-tag" aria-hidden="true">
                    {TYPES[column.detected_type][0]}
                  </span>
                  {TYPES[column.detected_type][1]}
                </td>
              )}
              {shown('completeness') && (
                <td>
                  <div className="profile-cell-completeness">
                    <span className="completeness-value">{formatPercent(column.completeness)}</span>
                    <div
                      className="completeness-bar"
                      role="meter"
                      aria-label={`Completeness ${formatPercent(column.completeness)}`}
                      aria-valuemin={0}
                      aria-valuemax={1}
                      aria-valuenow={column.completeness ?? 0}
                    >
                      <span style={{ width: `${(column.completeness ?? 0) * 100}%` }} />
                    </div>
                  </div>
                </td>
              )}
              {shown('unique') && <td>{formatCount(column.unique_count)}</td>}
              {shown('quality') && (
                <td>
                  <span className={`quality-badge quality-badge-${column.quality}`}>
                    {QUALITY_LABELS[column.quality]}
                  </span>
                </td>
              )}
              {shown('missing') && (
                <td>{formatCountWithPercent(column.missing_count, rowCount)}</td>
              )}
              {shown('examples') && (
                <td className="profile-cell-examples" title={column.examples.join(', ')}>
                  {column.examples.join(', ') || '—'}
                </td>
              )}
              <td className="profile-cell-menu">{rowMenu(column)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
