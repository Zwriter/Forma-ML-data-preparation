import type { Column } from '../../../types/dataset';
import type { StepType } from '../../../types/cleaning';
import {
  Choice,
  ColumnPicker,
  MultiColumnPicker,
  TextField,
  Toggle,
  hasColumn,
  isNumericColumn,
} from './formControls';
import { fillLabels, targetLabels } from '../stepCatalog';
import type { Parameters, StepFormDefinition, StepFormProps, Submission } from './formControls';

const numericOnly = ['mean', 'median'];

function FillForm({ parameters: p, columns, onChange, errorFor }: StepFormProps) {
  const numeric = isNumericColumn(columns, p.column);
  const strategies = Object.fromEntries(
    Object.entries(fillLabels).filter(([key]) => numeric || !numericOnly.includes(key)),
  );
  return (
    <>
      <ColumnPicker
        label="Column"
        columns={columns}
        value={p.column}
        onChange={(column) => {
          const keep =
            isNumericColumn(columns, column) || !numericOnly.includes(String(p.strategy));
          onChange({ ...p, column, strategy: keep ? p.strategy : 'constant' });
        }}
      />
      <Choice
        label="Fill with"
        value={p.strategy}
        labels={strategies}
        onChange={(strategy) => onChange({ ...p, strategy })}
      />
      {p.strategy === 'constant' && (
        <TextField
          label="Value"
          name="value"
          value={p.value}
          error={errorFor('value')}
          onChange={(value) => onChange({ ...p, value })}
        />
      )}
    </>
  );
}

function submitFill(p: Parameters, columns: Column[]): Submission {
  if (!hasColumn(columns, p.column)) return { error: 'Select a column.' };
  const base = { column: p.column, strategy: p.strategy };
  if (p.strategy !== 'constant') return { parameters: base };
  const text = String(p.value ?? '').trim();
  if (!text) return { error: 'Enter the value to fill missing cells with.', field: 'value' };
  if (!isNumericColumn(columns, p.column)) return { parameters: { ...base, value: p.value } };
  const value = Number(text);
  return Number.isFinite(value)
    ? { parameters: { ...base, value } }
    : { error: 'Enter a number for this numeric column.', field: 'value' };
}

function ReplaceForm({ parameters: p, columns, onChange, errorFor }: StepFormProps) {
  const missing = p.replace === null;
  return (
    <>
      <MultiColumnPicker
        legend="Columns"
        columns={columns}
        value={p.columns}
        onChange={(names) => onChange({ ...p, columns: names })}
      />
      <TextField
        label="Find"
        name="find"
        value={p.find}
        error={errorFor('find')}
        onChange={(find) => onChange({ ...p, find })}
      />
      <label>
        Replace with
        <input
          value={missing ? '' : String(p.replace ?? '')}
          disabled={missing}
          onChange={(event) => onChange({ ...p, replace: event.target.value })}
        />
      </label>
      <Toggle
        label="Replace with a missing value"
        checked={missing}
        onChange={(checked) => onChange({ ...p, replace: checked ? null : '' })}
      />
      <Toggle
        label="Match text inside cells"
        checked={p.match === 'contains'}
        onChange={(checked) => onChange({ ...p, match: checked ? 'contains' : 'whole' })}
      />
      <Toggle
        label="Match case"
        checked={Boolean(p.case_sensitive)}
        onChange={(case_sensitive) => onChange({ ...p, case_sensitive })}
      />
    </>
  );
}

function submitReplace(p: Parameters): Submission {
  if (!Array.isArray(p.columns) || !p.columns.length)
    return { error: 'Select at least one column.' };
  if (p.match === 'contains' && !p.find)
    return { error: 'Enter the text to find inside cells.', field: 'find' };
  return { parameters: p };
}

function ConvertForm({ parameters: p, columns, onChange }: StepFormProps) {
  return (
    <>
      <ColumnPicker
        label="Column"
        columns={columns}
        value={p.column}
        onChange={(column) => onChange({ ...p, column })}
      />
      <Choice
        label="Convert to"
        value={p.to}
        labels={targetLabels}
        onChange={(to) => onChange({ ...p, to })}
      />
      <Choice
        label="Values that cannot be converted"
        value={p.on_error ?? 'fail'}
        labels={{ fail: 'Stop the step and report how many', null: 'Make them missing' }}
        onChange={(on_error) => onChange({ ...p, on_error })}
      />
    </>
  );
}

export const valueForms = {
  fill_null: { Form: FillForm, submit: submitFill },
  replace_values: { Form: ReplaceForm, submit: submitReplace },
  convert_type: {
    Form: ConvertForm,
    submit: (p, columns) =>
      hasColumn(columns, p.column) ? { parameters: p } : { error: 'Select a column.' },
  },
} satisfies Partial<Record<StepType, StepFormDefinition>>;
