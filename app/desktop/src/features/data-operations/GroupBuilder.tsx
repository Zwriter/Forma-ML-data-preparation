import { useState } from 'react';
import type { Column } from '../../types/dataset';
import type { AggregateFunction, Aggregation, DataOperation } from '../../types/dataOperations';

type Props = {
  columns: Column[];
  onApply: (operation: DataOperation) => void;
  onClose: () => void;
  busy?: boolean;
};
type DraftAggregation = { column: string | null; function: AggregateFunction; output_name: string };

const functions: AggregateFunction[] = ['count', 'sum', 'average', 'minimum', 'maximum'];

function numeric(column?: Column) {
  return /int|float|double|decimal|uint/i.test(column?.type ?? '');
}

export function GroupBuilder({ columns, onApply, onClose, busy = false }: Props) {
  const [groups, setGroups] = useState<string[]>(columns[0] ? [columns[0].name] : []);
  const firstMeasure = columns.find(numeric);
  const [aggregations, setAggregations] = useState<DraftAggregation[]>([
    {
      column: firstMeasure?.name ?? null,
      function: firstMeasure ? 'sum' : 'count',
      output_name: firstMeasure ? `${firstMeasure.name}_sum` : 'count',
    },
  ]);
  const [error, setError] = useState('');

  function update(index: number, patch: Partial<DraftAggregation>) {
    setAggregations((current) =>
      current.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    );
    setError('');
  }

  function apply() {
    if (!groups.length) return setError('Choose at least one grouping column.');
    if (!aggregations.length || aggregations.some((item) => !item.output_name.trim()))
      return setError('Add a calculation and name each summary column.');
    if (
      new Set(aggregations.map((item) => item.output_name.trim())).size !== aggregations.length ||
      aggregations.some((item) => groups.includes(item.output_name.trim()))
    )
      return setError('Summary column names must be unique.');
    if (
      aggregations.some(
        (item) =>
          ['sum', 'average'].includes(item.function) &&
          !numeric(columns.find((column) => column.name === item.column)),
      )
    )
      return setError('Sum and average require numeric columns.');
    const result: Aggregation[] = aggregations.map((item) => ({
      ...item,
      output_name: item.output_name.trim(),
    }));
    onApply({ type: 'group_by', parameters: { group_columns: groups, aggregations: result } });
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section
        className="data-operation-dialog"
        role="dialog"
        aria-modal="true"
        aria-busy={busy}
        aria-labelledby="group-builder-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onClose();
        }}
      >
        <header>
          <h2 id="group-builder-title">Summarize rows</h2>
          <button type="button" aria-label="Close summary" onClick={onClose}>
            ×
          </button>
        </header>
        <fieldset>
          <legend>Group rows by</legend>
          {columns.map((column) => (
            <label key={column.name}>
              <input
                type="checkbox"
                aria-label={`Group by ${column.name}`}
                checked={groups.includes(column.name)}
                onChange={(event) =>
                  setGroups((current) =>
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
        <div className="reshape-aggregations">
          {aggregations.map((item, index) => (
            <div className="reshape-aggregation" key={index}>
              <label>
                Calculation {index + 1}
                <select
                  aria-label={`Calculation ${index + 1}`}
                  value={item.function}
                  onChange={(event) => {
                    const fn = event.target.value as AggregateFunction;
                    update(index, {
                      function: fn,
                      column: fn === 'count' ? null : (item.column ?? firstMeasure?.name ?? null),
                    });
                  }}
                >
                  {functions.map((fn) => (
                    <option key={fn} value={fn}>
                      {fn[0].toUpperCase() + fn.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              {item.function !== 'count' ? (
                <label>
                  Value column
                  <select
                    aria-label={`Summary value column ${index + 1}`}
                    value={item.column ?? ''}
                    onChange={(event) => update(index, { column: event.target.value })}
                  >
                    {columns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span>Count rows</span>
              )}
              <label>
                Summary column name {index + 1}
                <input
                  aria-label={`Summary column name ${index + 1}`}
                  value={item.output_name}
                  onChange={(event) => update(index, { output_name: event.target.value })}
                />
              </label>
              <button
                type="button"
                aria-label={`Remove calculation ${index + 1}`}
                disabled={aggregations.length === 1}
                onClick={() =>
                  setAggregations((current) => current.filter((_, position) => position !== index))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setAggregations((current) => [
              ...current,
              {
                column: firstMeasure?.name ?? null,
                function: firstMeasure ? 'sum' : 'count',
                output_name: firstMeasure
                  ? `${firstMeasure.name}_sum_${current.length + 1}`
                  : `count_${current.length + 1}`,
              },
            ])
          }
        >
          Add calculation
        </button>
        {error && <p role="alert">{error}</p>}
        <footer className="dialog-actions">
          <button type="button" className="quiet-button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={apply}>
            {busy ? 'Applying…' : 'Apply summary'}
          </button>
        </footer>
      </section>
    </div>
  );
}
