import { useState } from 'react';
import type { Column } from '../../types/dataset';
import type { AggregateFunction, DataOperation } from '../../types/dataOperations';
import { DragGrip } from '../../components/DragGrip';
import { popupStyle } from '../workspace/popupPositions';
import type { PopupPosition } from '../workspace/popupPositions';

type Props = {
  columns: Column[];
  onApply: (operation: DataOperation) => void;
  onClose: () => void;
  popupPosition?: PopupPosition;
  busy?: boolean;
};
const functions: AggregateFunction[] = ['count', 'sum', 'average', 'minimum', 'maximum'];

function numeric(column?: Column) {
  return /int|float|double|decimal|uint/i.test(column?.type ?? '');
}

export function PivotBuilder({ columns, onApply, onClose, busy = false, popupPosition }: Props) {
  const [rows, setRows] = useState<string[]>(columns[0] ? [columns[0].name] : []);
  const [category, setCategory] = useState(
    columns.find((column) => column.name !== columns[0]?.name)?.name ?? '',
  );
  const [value, setValue] = useState(columns.find(numeric)?.name ?? '');
  const [fn, setFn] = useState<AggregateFunction>('sum');
  const [error, setError] = useState('');

  function apply() {
    if (!rows.length) return setError('Choose at least one row label column.');
    if (!category || !value || new Set([...rows, category, value]).size !== rows.length + 2)
      return setError('Choose different columns for row labels, category, and value.');
    if (
      ['sum', 'average'].includes(fn) &&
      !numeric(columns.find((column) => column.name === value))
    )
      return setError('Sum and average require a numeric value column.');
    onApply({
      type: 'pivot',
      parameters: {
        row_columns: rows,
        category_column: category,
        value_column: value,
        function: fn,
      },
    });
  }

  return (
    <div className="dialog-backdrop data-operation-backdrop">
      <section
        className="data-operation-dialog"
        style={popupStyle(popupPosition)}
        role="dialog"
        aria-busy={busy}
        aria-labelledby="pivot-builder-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onClose();
        }}
      >
        <header>
          <DragGrip />
          <h2 id="pivot-builder-title">Turn categories into columns</h2>
        </header>
        <fieldset>
          <legend>Row labels</legend>
          {columns.map((column) => (
            <label key={column.name}>
              <input
                type="checkbox"
                aria-label={`Row label ${column.name}`}
                checked={rows.includes(column.name)}
                onChange={(event) =>
                  setRows((current) =>
                    event.target.checked
                      ? [...current, column.name]
                      : current.filter((name) => name !== column.name),
                  )
                }
              />
              {column.name}
            </label>
          ))}
        </fieldset>
        <label>
          Category column
          <select
            aria-label="Pivot category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {columns.map((column) => (
              <option key={column.name} value={column.name}>
                {column.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Value column
          <select
            aria-label="Pivot value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          >
            {columns.map((column) => (
              <option key={column.name} value={column.name}>
                {column.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Calculation
          <select
            aria-label="Pivot calculation"
            value={fn}
            onChange={(event) => setFn(event.target.value as AggregateFunction)}
          >
            {functions.map((item) => (
              <option key={item} value={item}>
                {item[0].toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </label>
        {error && <p role="alert">{error}</p>}
        <footer className="dialog-actions">
          <button type="button" className="quiet-button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={apply}>
            {busy ? 'Applying…' : 'Apply pivot'}
          </button>
        </footer>
      </section>
    </div>
  );
}
