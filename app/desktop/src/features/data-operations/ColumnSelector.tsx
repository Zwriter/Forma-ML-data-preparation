import { useMemo, useState } from 'react';
import type { Column } from '../../types/dataset';
import { DragGrip } from '../../components/DragGrip';
import { popupStyle } from '../workspace/popupPositions';
import type { PopupPosition } from '../workspace/popupPositions';

type Props = {
  columns: Column[];
  selectedColumns: string[];
  onConfirm: (columns: string[]) => void;
  onClose: () => void;
  popupPosition?: PopupPosition;
};

export function ColumnSelector({
  columns,
  selectedColumns,
  onConfirm,
  onClose,
  popupPosition,
}: Props) {
  const [draft, setDraft] = useState(selectedColumns);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return columns.filter((column) => column.name.toLowerCase().includes(normalized));
  }, [columns, query]);

  function toggle(name: string) {
    setDraft((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
    setError('');
  }

  function move(name: string, direction: -1 | 1) {
    setDraft((current) => {
      const index = current.indexOf(name);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function confirm() {
    if (!draft.length) {
      setError('Select at least one column.');
      return;
    }
    onConfirm(draft);
  }

  return (
    <div className="dialog-backdrop column-selector-backdrop">
      <section
        className="column-selector dialog"
        style={popupStyle(popupPosition)}
        role="dialog"
        aria-labelledby="column-selector-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <header>
          <DragGrip />
          <h2 id="column-selector-title" className="column-selector-title">
            Select columns
          </h2>
        </header>
        <label className="column-selector-search">
          Search columns
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="column-selector-actions">
          <button
            type="button"
            onClick={() =>
              setDraft((current) => [
                ...new Set([...current, ...visible.map((column) => column.name)]),
              ])
            }
          >
            Select all
          </button>
          <button type="button" onClick={() => setDraft([])}>
            Clear all
          </button>
        </div>
        <ul className="column-selector-list" aria-label="Available columns">
          {visible.map((column) => (
            <li key={column.name}>
              <label>
                <input
                  type="checkbox"
                  checked={draft.includes(column.name)}
                  onChange={() => toggle(column.name)}
                />
                <span>{column.name}</span>
                <small>{column.type}</small>
              </label>
              {draft.includes(column.name) && (
                <span className="column-order-controls" aria-label={`Order ${column.name}`}>
                  <button
                    type="button"
                    aria-label={`Move ${column.name} up`}
                    disabled={draft.indexOf(column.name) === 0}
                    onClick={() => move(column.name, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${column.name} down`}
                    disabled={draft.indexOf(column.name) === draft.length - 1}
                    onClick={() => move(column.name, 1)}
                  >
                    ↓
                  </button>
                </span>
              )}
            </li>
          ))}
          {!visible.length && <li className="column-selector-empty">No columns match search.</li>}
        </ul>
        {error && (
          <p role="alert" className="column-selector-error">
            {error}
          </p>
        )}
        <footer className="dialog-actions">
          <button type="button" className="quiet-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={confirm}>
            Apply columns
          </button>
        </footer>
      </section>
    </div>
  );
}
