import { useState } from 'react';
import type { Column } from '../../types/dataset';
import type { DataOperation, FilterOperator, FilterRule } from '../../types/dataOperations';
import { filterInputType, filterOperatorLabels, filterOperatorsFor } from './filterOptions';
import { DragGrip } from '../../components/DragGrip';
import { popupStyle } from '../workspace/popupPositions';
import type { PopupPosition } from '../workspace/popupPositions';

type Props = {
  columns: Column[];
  onApply: (operation: DataOperation) => void;
  onClose: () => void;
  popupPosition?: PopupPosition;
};
export function FilterBuilder({ columns, onApply, onClose, popupPosition }: Props) {
  const [rules, setRules] = useState<FilterRule[]>(() => [
    {
      column: columns[0]?.name ?? '',
      operator: filterOperatorsFor(columns, columns[0]?.name ?? '')[0],
      value: '',
    },
  ]);
  const [mode, setMode] = useState<'all' | 'any'>('all');
  const [error, setError] = useState('');

  function update(index: number, patch: Partial<FilterRule>) {
    setRules((current) =>
      current.map((rule, position) => (position === index ? { ...rule, ...patch } : rule)),
    );
    setError('');
  }

  function apply() {
    if (
      !rules.length ||
      rules.some(
        (rule) =>
          !rule.column ||
          (!['is_empty', 'is_not_empty'].includes(rule.operator) && rule.value === ''),
      )
    ) {
      setError('Choose a column and enter each comparison value.');
      return;
    }
    onApply({ type: 'filter_rows', parameters: { mode, rules } });
  }

  return (
    <div className="dialog-backdrop data-operation-backdrop">
      <section
        className="data-operation-dialog"
        style={popupStyle(popupPosition)}
        role="dialog"
        aria-labelledby="filter-builder-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <header>
          <DragGrip />
          <h2 id="filter-builder-title">Filter rows</h2>
        </header>
        <label>
          Match
          <select
            aria-label="Filter matching mode"
            value={mode}
            onChange={(event) => setMode(event.target.value as 'all' | 'any')}
          >
            <option value="all">all conditions</option>
            <option value="any">any condition</option>
          </select>
        </label>
        <div className="filter-rules">
          {rules.map((rule, index) => {
            const operators = filterOperatorsFor(columns, rule.column);
            return (
              <div className="filter-rule" key={index}>
                <label>
                  Column
                  <select
                    aria-label={`Filter column ${index + 1}`}
                    value={rule.column}
                    onChange={(event) =>
                      update(index, {
                        column: event.target.value,
                        operator: filterOperatorsFor(columns, event.target.value)[0],
                        value: '',
                      })
                    }
                  >
                    {columns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Condition
                  <select
                    aria-label={`Filter condition ${index + 1}`}
                    value={rule.operator}
                    onChange={(event) =>
                      update(index, { operator: event.target.value as FilterOperator, value: '' })
                    }
                  >
                    {operators.map((operator) => (
                      <option key={operator} value={operator}>
                        {filterOperatorLabels[operator]}
                      </option>
                    ))}
                  </select>
                </label>
                {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                  <label>
                    Value
                    <input
                      aria-label={`Filter value ${index + 1}`}
                      type={filterInputType(columns, rule.column)}
                      value={String(rule.value ?? '')}
                      onChange={(event) => update(index, { value: event.target.value })}
                    />
                  </label>
                )}
                {columns
                  .find((column) => column.name === rule.column)
                  ?.type.toLowerCase()
                  .includes('string') &&
                  ['contains', 'begins_with', 'ends_with', 'equals', 'not_equals'].includes(
                    rule.operator,
                  ) && (
                    <label className="filter-case-check">
                      <input
                        type="checkbox"
                        checked={rule.case_sensitive ?? false}
                        onChange={(event) =>
                          update(index, { case_sensitive: event.target.checked })
                        }
                      />{' '}
                      Case sensitive
                    </label>
                  )}
                <button
                  type="button"
                  aria-label={`Remove condition ${index + 1}`}
                  disabled={rules.length === 1}
                  onClick={() =>
                    setRules((current) => current.filter((_, position) => position !== index))
                  }
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
        <div className="filter-builder-actions">
          <button
            type="button"
            onClick={() => {
              const column = columns[0]?.name ?? '';
              setRules((current) => [
                ...current,
                { column, operator: filterOperatorsFor(columns, column)[0], value: '' },
              ]);
            }}
          >
            Add condition
          </button>
          <button
            type="button"
            onClick={() => {
              setRules([]);
              setError('');
            }}
          >
            Clear all conditions
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
        <footer className="dialog-actions">
          <button type="button" className="quiet-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={apply}>
            Apply filter
          </button>
        </footer>
      </section>
    </div>
  );
}
