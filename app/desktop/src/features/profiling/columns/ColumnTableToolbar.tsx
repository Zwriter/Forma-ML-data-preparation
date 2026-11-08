import type { ReactNode } from 'react';
import type { ColumnFilter } from './columnTableModel';

const TYPE_OPTIONS = [
  ['all', 'All types'],
  ['text', 'Text'],
  ['integer', 'Integer'],
  ['decimal', 'Decimal'],
  ['datetime', 'Date/time'],
  ['boolean', 'Boolean'],
  ['other', 'Other'],
] as const;

const QUALITY_OPTIONS = [
  ['all', 'All quality'],
  ['good', 'Good'],
  ['needs_attention', 'Needs attention'],
  ['poor', 'Poor'],
] as const;

export function ColumnTableToolbar({
  filter,
  count,
  onChange,
  settings,
}: {
  filter: ColumnFilter;
  count: string;
  onChange: (filter: ColumnFilter) => void;
  settings: ReactNode;
}) {
  return (
    <div className="profile-table-toolbar">
      <h3>Columns</h3>
      <input
        type="search"
        aria-label="Search columns"
        placeholder="Search columns…"
        value={filter.search}
        onChange={(event) => onChange({ ...filter, search: event.target.value })}
      />
      <select
        aria-label="Type filter"
        value={filter.type}
        onChange={(event) =>
          onChange({ ...filter, type: event.target.value as ColumnFilter['type'] })
        }
      >
        {TYPE_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        aria-label="Quality filter"
        value={filter.quality}
        onChange={(event) =>
          onChange({ ...filter, quality: event.target.value as ColumnFilter['quality'] })
        }
      >
        {QUALITY_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <span className="profile-table-count" role="status">
        {count}
      </span>
      {settings}
    </div>
  );
}
