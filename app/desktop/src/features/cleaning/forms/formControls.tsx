import type { Column } from '../../../types/dataset';

export type Parameters = Record<string, unknown>;

export type StepFormProps = {
  parameters: Parameters;
  columns: Column[];
  onChange: (parameters: Parameters) => void;
};

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
  return (
    <label>
      {label}
      <select value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}>
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
