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
};

/** One worksheet column header: name, type, Clean notes, and the active sort. */
export function ColumnHeading({
  column,
  selected,
  note,
  view = [],
  onSelect,
  onOpenDetails,
}: Props) {
  const index = view.findIndex((key) => key.column === column.name);
  const sort = index >= 0 ? view[index] : null;
  const priority = sort && view.length > 1 ? index + 1 : null;
  const sortLabel = sort
    ? `, sorted ${sort.direction}${priority ? `, priority ${priority}` : ''}`
    : '';
  return (
    <th
      className={selected ? 'selected' : ''}
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
    </th>
  );
}
