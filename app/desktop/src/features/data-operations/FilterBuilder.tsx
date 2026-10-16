import { useState } from 'react';
import type { Column } from '../../types/dataset';
import type { DataOperation, FilterOperator, FilterRule } from '../../types/dataOperations';

type Props = { columns: Column[]; onApply: (operation: DataOperation) => void; onClose: () => void };
const textOps: FilterOperator[] = ['equals', 'not_equals', 'contains', 'begins_with', 'ends_with', 'is_empty', 'is_not_empty'];
const numberOps: FilterOperator[] = ['equals', 'not_equals', 'greater_than', 'less_than', 'at_least', 'at_most', 'is_empty', 'is_not_empty'];
const labels: Record<FilterOperator, string> = {
  equals: 'is', not_equals: 'is not', contains: 'contains', begins_with: 'begins with', ends_with: 'ends with',
  greater_than: 'greater than', less_than: 'less than', at_least: 'at least', at_most: 'at most',
  is_empty: 'is empty', is_not_empty: 'is not empty',
};

export function FilterBuilder({ columns, onApply, onClose }: Props) {
  const [rules, setRules] = useState<FilterRule[]>(() => [{
    column: columns[0]?.name ?? '', operator: operatorsFor(columns[0]?.name ?? '')[0], value: '',
  }]);
  const [mode, setMode] = useState<'all' | 'any'>('all');
  const [error, setError] = useState('');

  function operatorsFor(columnName: string) {
    const type = columns.find((column) => column.name === columnName)?.type.toLowerCase() ?? '';
    if (type.includes('int') || type.includes('float') || type.includes('double') || type.includes('decimal')) return numberOps;
    if (type.includes('date')) return ['equals', 'not_equals', 'greater_than', 'less_than', 'at_least', 'at_most', 'is_empty', 'is_not_empty'] as FilterOperator[];
    if (type.includes('bool')) return ['equals', 'not_equals', 'is_empty', 'is_not_empty'] as FilterOperator[];
    return textOps;
  }

  function valueType(columnName: string) {
    const type = columns.find((column) => column.name === columnName)?.type.toLowerCase() ?? '';
    if (type.includes('int') || type.includes('float') || type.includes('double') || type.includes('decimal')) return 'number';
    if (type.includes('date')) return 'date';
    return 'text';
  }

  function update(index: number, patch: Partial<FilterRule>) {
    setRules((current) => current.map((rule, position) => position === index ? { ...rule, ...patch } : rule));
    setError('');
  }

  function apply() {
    if (!rules.length || rules.some((rule) => !rule.column || (!['is_empty', 'is_not_empty'].includes(rule.operator) && rule.value === ''))) {
      setError('Choose a column and enter each comparison value.');
      return;
    }
    onApply({ type: 'filter_rows', parameters: { mode, rules } });
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section className="data-operation-dialog" role="dialog" aria-modal="true" aria-labelledby="filter-builder-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
        <header><h2 id="filter-builder-title">Filter rows</h2><button type="button" aria-label="Close filter" onClick={onClose}>×</button></header>
        <label>Match
          <select aria-label="Filter matching mode" value={mode} onChange={(event) => setMode(event.target.value as 'all' | 'any')}>
            <option value="all">all conditions</option><option value="any">any condition</option>
          </select>
        </label>
        <div className="filter-rules">
          {rules.map((rule, index) => {
            const operators = operatorsFor(rule.column);
            return <div className="filter-rule" key={index}>
              <label>Column
                <select aria-label={`Filter column ${index + 1}`} value={rule.column} onChange={(event) => update(index, { column: event.target.value, operator: operatorsFor(event.target.value)[0], value: '' })}>
                  {columns.map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
                </select>
              </label>
              <label>Condition
                <select aria-label={`Filter condition ${index + 1}`} value={rule.operator} onChange={(event) => update(index, { operator: event.target.value as FilterOperator, value: '' })}>
                  {operators.map((operator) => <option key={operator} value={operator}>{labels[operator]}</option>)}
                </select>
              </label>
              {!['is_empty', 'is_not_empty'].includes(rule.operator) && <label>Value
                <input aria-label={`Filter value ${index + 1}`} type={valueType(rule.column)} value={String(rule.value ?? '')} onChange={(event) => update(index, { value: event.target.value })} />
              </label>}
              {columns.find((column) => column.name === rule.column)?.type.toLowerCase().includes('string') && ['contains', 'begins_with', 'ends_with', 'equals', 'not_equals'].includes(rule.operator) && <label className="filter-case-check">
                <input type="checkbox" checked={rule.case_sensitive ?? false} onChange={(event) => update(index, { case_sensitive: event.target.checked })} /> Case sensitive
              </label>}
              <button type="button" aria-label={`Remove condition ${index + 1}`} disabled={rules.length === 1} onClick={() => setRules((current) => current.filter((_, position) => position !== index))}>Remove</button>
            </div>;
          })}
        </div>
        <div className="filter-builder-actions">
        <button type="button" onClick={() => {
          const column = columns[0]?.name ?? '';
          setRules((current) => [...current, { column, operator: operatorsFor(column)[0], value: '' }]);
        }}>Add condition</button>
        <button type="button" onClick={() => { setRules([]); setError(''); }}>Clear all conditions</button>
        </div>
        {error && <p role="alert">{error}</p>}
        <footer className="dialog-actions"><button type="button" className="quiet-button" onClick={onClose}>Cancel</button><button type="button" onClick={apply}>Apply filter</button></footer>
      </section>
    </div>
  );
}
