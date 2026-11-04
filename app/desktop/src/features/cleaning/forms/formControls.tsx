import { useId } from 'react';
import type { ComponentType } from 'react';
import type { StepType } from '../../../types/cleaning';
import type { Column } from '../../../types/dataset';

export type Parameters = Record<string, unknown>;

export type StepFormProps = {
  parameters: Parameters;
  columns: Column[];
  onChange: (parameters: Parameters) => void;
  type: StepType;
  /** Lets one form cover several step types (Remove: duplicates, missing rows, columns). */
  onTypeChange: (type: StepType) => void;
  /** The current error message for a field, matched by the field's `name`. */
  errorFor: (field: string) => string;
};

/** `field` names the input the error belongs to, so it shows under that input. */
export type Submission = { error: string; field?: string } | { parameters: Parameters };

export type StepFormDefinition = {
  Form: ComponentType<StepFormProps>;
  submit: (parameters: Parameters, columns: Column[]) => Submission;
};

export function duplicateName(names: string[]) {
  return names.find((name, index) => names.indexOf(name) !== index);
}

const MAX_NAME_LENGTH = 128;

/** Basic checks for a new column name; `taken` holds the names it must not clash with. */
export function columnNameError(name: string, taken: string[]) {
  if (!name) return 'Enter a new name.';
  if (name.length > MAX_NAME_LENGTH) return `Use ${MAX_NAME_LENGTH} characters or fewer.`;
  return taken.includes(name) ? `Column name "${name}" is already used.` : '';
}

/** A labelled text input that shows its own error underneath and is marked invalid. */
export function TextField({
  label,
  name,
  value,
  error = '',
  onChange,
}: {
  label: string;
  name: string;
  value: unknown;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${useId()}-error`;
  return (
    <>
      <label>
        {label}
        <input
          name={name}
          value={String(value ?? '')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <FieldError id={errorId} message={error} />
    </>
  );
}

export const hasColumn = (columns: Column[], name: unknown) =>
  columns.some((column) => column.name === name);

export function isNumericColumn(columns: Column[], name: unknown) {
  return /int|float|double|decimal/i.test(
    columns.find((column) => column.name === name)?.type ?? '',
  );
}

export function ColumnPicker({
  label,
  columns,
  value,
  onChange,
}: {
  label: string;
  columns: Column[];
  value: unknown;
  onChange: (name: string) => void;
}) {
  // A saved column an earlier step renamed or removed is not offered; ask for a new one.
  const missing = !hasColumn(columns, value);
  return (
    <label>
      {label}
      <select
        value={missing ? '' : String(value)}
        onChange={(event) => onChange(event.target.value)}
      >
        {missing && (
          <option value="" disabled>
            Select a column
          </option>
        )}
        {columns.map((column) => (
          <option key={column.name} value={column.name}>
            {column.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Checked names keep the order they were picked in, which merge relies on. */
export function MultiColumnPicker({
  legend,
  columns,
  value,
  onChange,
}: {
  legend: string;
  columns: Column[];
  value: unknown;
  onChange: (names: string[]) => void;
}) {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  return (
    <fieldset className="column-checklist">
      <legend>{legend}</legend>
      {columns.map((column) => (
        <label className="check" key={column.name}>
          <input
            type="checkbox"
            checked={selected.includes(column.name)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...selected, column.name]
                  : selected.filter((name) => name !== column.name),
              )
            }
          />
          {column.name}
        </label>
      ))}
    </fieldset>
  );
}

export function FieldError({ id, message }: { id: string; message: string }) {
  return message ? (
    <p id={id} className="field-error" role="alert">
      {message}
    </p>
  ) : null;
}

export function Choice({
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

export function Toggle({
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
