import type { Column } from '../../types/dataset';
import type { SortKey } from '../../types/dataOperations';
import { ColumnTypeIcon, columnTypeKind } from './ColumnTypeIcon';

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

/** One worksheet column header: type icon, name, Clean notes, and the active sort. */
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
  const numeric = columnTypeKind(column.type) === 'number';
  return (
    <th
      className={`${selected ? 'selected' : ''}${onSort ? ' sortable' : ''}${sort ? ' sorted' : ''}${numeric ? ' numeric' : ''}`}
      aria-sort={sort && index === 0 ? sort.direction : undefined}
    >
      <div className="column-heading-row">
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
          <ColumnTypeIcon type={column.type} />
          <strong>{column.name}</strong>
          <span className="sr-only">{column.type}</span>
          {sort && (
            <span className="column-sort sr-only">
              {sort.direction === 'ascending' ? 'Ascending' : 'Descending'}
              {priority ? ` ${priority}` : ''}
            </span>
          )}
        </button>
        {onSort && (
          <span className="column-sort-buttons">
            {DIRECTIONS.map((direction) => {
              // Pressing the arrow of the only active sort key clears the sort.
              const active = view.length === 1 && sort?.direction === direction;
              const current = sort?.direction === direction;
              return (
                <button
                  key={direction}
                  type="button"
                  className={current ? 'current' : undefined}
                  aria-label={`Sort ${column.name} ${direction}`}
                  title={`Sort ${direction}`}
                  aria-pressed={active}
                  onClick={() =>
                    onSort(active ? [] : [{ column: column.name, direction, nulls: 'last' }])
                  }
                >
                  <span aria-hidden="true">{direction === 'ascending' ? '↑' : '↓'}</span>
                </button>
              );
            })}
            {priority && <span className="column-sort-priority">{priority}</span>}
          </span>
        )}
      </div>
      {note && <small className="column-note">{note}</small>}
    </th>
  );
}
