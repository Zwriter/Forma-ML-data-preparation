import { useState } from 'react';
import type { Column } from '../../types/dataset';
import type { DataOperation } from '../../types/dataOperations';
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

function numeric(column?: Column) {
  return /int|float|double|decimal|uint/i.test(column?.type ?? '');
}

export function UnpivotBuilder({ columns, onApply, onClose, busy = false, popupPosition }: Props) {
  const [identifiers, setIdentifiers] = useState<string[]>(columns[0] ? [columns[0].name] : []);
  const [values, setValues] = useState<string[]>(() => {
    const measures = columns.filter((column, index) => index > 0 && numeric(column));
    return (measures.length ? measures : columns.slice(1)).map((column) => column.name);
  });
  const [attribute, setAttribute] = useState('attribute');
  const [value, setValue] = useState('value');
  const [error, setError] = useState('');

  function apply() {
    if (!identifiers.length || !values.length)
      return setError('Choose at least one identifier and value column.');
    if (values.some((name) => identifiers.includes(name)))
      return setError('Identifier and value columns must be separate.');
    if (
      !attribute.trim() ||
      !value.trim() ||
      attribute.trim() === value.trim() ||
      columns.some((column) => [attribute.trim(), value.trim()].includes(column.name))
    )
      return setError('Enter unique output names that do not match existing columns.');
    onApply({
      type: 'unpivot',
      parameters: {
        identifier_columns: identifiers,
        value_columns: values,
        attribute_name: attribute.trim(),
        value_name: value.trim(),
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
        aria-labelledby="unpivot-builder-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onClose();
        }}
      >
        <header>
          <DragGrip />
          <h2 id="unpivot-builder-title">Turn columns into rows</h2>
        </header>
        <fieldset>
          <legend>Keep as identifiers</legend>
          {columns.map((column) => (
            <label key={column.name}>
              <input
                type="checkbox"
                aria-label={`Identifier ${column.name}`}
                checked={identifiers.includes(column.name)}
                onChange={(event) =>
                  setIdentifiers((current) =>
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
        <fieldset>
          <legend>Turn into values</legend>
          {columns.map((column) => (
            <label key={column.name}>
              <input
                type="checkbox"
                aria-label={`Unpivot value ${column.name}`}
                checked={values.includes(column.name)}
                onChange={(event) =>
                  setValues((current) =>
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
          Attribute column name
          <input
            aria-label="Attribute column name"
            value={attribute}
            onChange={(event) => setAttribute(event.target.value)}
          />
        </label>
        <label>
          Value column name
          <input
            aria-label="Value column name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <footer className="dialog-actions">
          <button type="button" className="quiet-button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={apply}>
            {busy ? 'Applying…' : 'Apply unpivot'}
          </button>
        </footer>
      </section>
    </div>
  );
}
