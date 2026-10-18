import { useState } from 'react';
import type { Column } from '../../types/dataset';
import type { DataOperation, SortKey } from '../../types/dataOperations';

type Props = {
  columns: Column[];
  onApply: (operation: DataOperation) => void;
  onClose: () => void;
};

export function SortBuilder({ columns, onApply, onClose }: Props) {
  const [keys, setKeys] = useState<SortKey[]>([
    { column: columns[0]?.name ?? '', direction: 'ascending', nulls: 'last' },
  ]);
  const [error, setError] = useState('');

  function update(index: number, patch: Partial<SortKey>) {
    setKeys((current) =>
      current.map((key, position) => (position === index ? { ...key, ...patch } : key)),
    );
    setError('');
  }

  function move(index: number, direction: -1 | 1) {
    setKeys((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function apply() {
    if (
      !keys.length ||
      keys.some((key) => !key.column) ||
      new Set(keys.map((key) => key.column)).size !== keys.length
    ) {
      setError('Choose a different column for each sort priority.');
      return;
    }
    onApply({ type: 'sort_rows', parameters: { keys } });
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section
        className="data-operation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sort-builder-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <header>
          <h2 id="sort-builder-title">Sort rows</h2>
          <button type="button" aria-label="Close sort" onClick={onClose}>
            ×
          </button>
        </header>
        <p>
          Sort keys run in listed priority order. Missing values stay first or last as selected.
        </p>
        <div className="sort-keys">
          {keys.map((key, index) => (
            <div className="sort-key" key={index}>
              <strong>Priority {index + 1}</strong>
              <label>
                Column
                <select
                  aria-label={`Sort column ${index + 1}`}
                  value={key.column}
                  onChange={(event) => update(index, { column: event.target.value })}
                >
                  {columns.map((column) => (
                    <option key={column.name} value={column.name}>
                      {column.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Direction
                <select
                  aria-label={`Sort direction ${index + 1}`}
                  value={key.direction}
                  onChange={(event) =>
                    update(index, { direction: event.target.value as SortKey['direction'] })
                  }
                >
                  <option value="ascending">Ascending</option>
                  <option value="descending">Descending</option>
                </select>
              </label>
              <label>
                Missing values
                <select
                  aria-label={`Missing values ${index + 1}`}
                  value={key.nulls}
                  onChange={(event) =>
                    update(index, { nulls: event.target.value as SortKey['nulls'] })
                  }
                >
                  <option value="first">First</option>
                  <option value="last">Last</option>
                </select>
              </label>
              <button
                type="button"
                aria-label={`Move sort key ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move sort key ${index + 1} down`}
                disabled={index === keys.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`Remove sort key ${index + 1}`}
                disabled={keys.length === 1}
                onClick={() =>
                  setKeys((current) => current.filter((_, position) => position !== index))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={keys.length >= columns.length}
          onClick={() =>
            setKeys((current) => [
              ...current,
              {
                column:
                  columns.find((column) => !current.some((key) => key.column === column.name))
                    ?.name ?? '',
                direction: 'ascending',
                nulls: 'last',
              },
            ])
          }
        >
          Add sort key
        </button>
        {error && <p role="alert">{error}</p>}
        <footer className="dialog-actions">
          <button type="button" className="quiet-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={apply}>
            Apply sort
          </button>
        </footer>
      </section>
    </div>
  );
}
