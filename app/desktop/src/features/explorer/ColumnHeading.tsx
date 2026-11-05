import type { Column } from '../../types/dataset';
import type { SortKey } from '../../types/dataOperations';

type Props = {
  column: Column;
  selected: boolean;
  note?: string;
  /** The active sort, so the heading can say whether and how this column is sorted. */
  view?: SortKey[];
  onSelect: (name: string) => void;
  onOpenDetails: (name: string) => void;
  /** Quick sort from the header; omitted where this column cannot be sorted. */
  onSort?: (keys: SortKey[]) => void;
};

const DIRECTIONS: SortKey['direction'][] = ['ascending', 'descending'];

/** One worksheet column header: name, type, Clean notes, and the active sort. */
export function ColumnHeading({
  column,
  selected,
  note,
  view = [],
  onSelect,
  onOpenDetails,
  onSort,
}: Props) {
  const index = view.findIndex((key) => key.column === column.name);
  const sort = index >= 0 ? view[index] : null;
  const priority = sort && view.length > 1 ? index + 1 : null;
  const sortLabel = sort
    ? `, sorted ${sort.direction}${priority ? `, priority ${priority}` : ''}`
    : '';
  return (
    <th
      className={`${selected ? 'selected' : ''}${onSort ? ' sortable' : ''}`}
      aria-sort={sort && index === 0 ? sort.direction : undefined}
    >
      <button
        type="button"
        className="column-heading"
        aria-label={`Show details for ${column.name}${sortLabel}`}
        aria-pressed={selected}
        onClick={() => onSelect(column.name)}
        onContextMenu={(event) => {
          event.preventDefault();
          onOpenDetails(column.name);
        }}
      >
        <strong>{column.name}</strong>
        <small>
          <span aria-hidden="true">
            {column.type.toLowerCase().match(/int|float|double|decimal/) ? '#' : 'A'}
          </span>{' '}
          {column.type}
        </small>
        {sort && (
          <small className="column-sort">
            <span aria-hidden="true">{sort.direction === 'ascending' ? '▲' : '▼'}</span>{' '}
            {sort.direction === 'ascending' ? 'Ascending' : 'Descending'}
            {priority ? ` ${priority}` : ''}
          </small>
        )}
        {note && <small className="column-note">{note}</small>}
      </button>
      {onSort && (
        <span className="column-sort-buttons">
          {DIRECTIONS.map((direction) => {
            // Pressing the arrow of the only active sort key clears the sort.
            const active = view.length === 1 && sort?.direction === direction;
            return (
              <button
                key={direction}
                type="button"
                aria-label={`Sort ${column.name} ${direction}`}
                title={`Sort ${direction}`}
                aria-pressed={active}
                onClick={() =>
                  onSort(active ? [] : [{ column: column.name, direction, nulls: 'last' }])
                }
              >
                <span aria-hidden="true">{direction === 'ascending' ? '▲' : '▼'}</span>
              </button>
            );
          })}
        </span>
      )}
    </th>
  );
}
