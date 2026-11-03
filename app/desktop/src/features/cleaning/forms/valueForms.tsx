import type { ComponentType } from 'react';
import type { Column } from '../../../types/dataset';
import type { StepType } from '../../../types/cleaning';
import { ColumnPicker, MultiColumnPicker, isNumericColumn } from './formControls';
import type { Parameters, StepFormProps } from './formControls';

export type Submission = { error: string } | { parameters: Parameters };

export type StepFormDefinition = {
  Form: ComponentType<StepFormProps>;
  submit: (parameters: Parameters, columns: Column[]) => Submission;
};

const fillLabels: Record<string, string> = {
  constant: 'Fixed value',
  mean: 'Average',
  median: 'Median',
  mode: 'Most frequent value',
  previous: 'Previous value',
  next: 'Next value',
};
const numericOnly = ['mean', 'median'];

const targetLabels: Record<string, string> = {
  string: 'Text',
  integer: 'Whole number',
  float: 'Decimal number',
  boolean: 'True/false',
  date: 'Date',
};

function Choice({
  label,
  value,
  labels,
  onChange,
}: {
  label: string;
  value: unknown;
  labels: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={String(value)} onChange={(event) => onChange(event.target.value)}>
        {Object.entries(labels).map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function FillForm({ parameters: p, columns, onChange }: StepFormProps) {
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
        <label>
          Value
          <input
            value={String(p.value ?? '')}
            onChange={(event) => onChange({ ...p, value: event.target.value })}
          />
        </label>
      )}
    </>
  );
}

function submitFill(p: Parameters, columns: Column[]): Submission {
  if (!p.column) return { error: 'Select a column.' };
  const base = { column: p.column, strategy: p.strategy };
  if (p.strategy !== 'constant') return { parameters: base };
  const text = String(p.value ?? '').trim();
  if (!text) return { error: 'Enter the value to fill missing cells with.' };
  if (!isNumericColumn(columns, p.column)) return { parameters: { ...base, value: p.value } };
  const value = Number(text);
  return Number.isFinite(value)
    ? { parameters: { ...base, value } }
    : { error: 'Enter a number for this numeric column.' };
}

function ReplaceForm({ parameters: p, columns, onChange }: StepFormProps) {
  const missing = p.replace === null;
  return (
    <>
      <MultiColumnPicker
        legend="Columns"
        columns={columns}
        value={p.columns}
        onChange={(names) => onChange({ ...p, columns: names })}
      />
      <label>
        Find
        <input
          value={String(p.find ?? '')}
          onChange={(event) => onChange({ ...p, find: event.target.value })}
        />
      </label>
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
  if (p.match === 'contains' && !p.find) return { error: 'Enter the text to find inside cells.' };
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

export const valueForms: Partial<Record<StepType, StepFormDefinition>> = {
  fill_null: { Form: FillForm, submit: submitFill },
  replace_values: { Form: ReplaceForm, submit: submitReplace },
  convert_type: {
    Form: ConvertForm,
    submit: (p) => (p.column ? { parameters: p } : { error: 'Select a column.' }),
  },
};
