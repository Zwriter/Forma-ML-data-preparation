import type { Column } from '../../../types/dataset';
import { ColumnPicker, TextField, columnNameError, hasColumn } from './formControls';
import type { Parameters, StepFormProps, Submission } from './formControls';

type Row = [from: string, to: string];

const rowsOf = (p: Parameters) =>
  Object.entries((p.mapping as Record<string, string>) ?? {}) as Row[];
const fieldName = (from: string) => `rename:${from}`;

/** One row per renamed column: pick it from a dropdown, then type its new name. */
export function RenameForm({ parameters: p, columns, onChange, errorFor }: StepFormProps) {
  const rows = rowsOf(p);
  const update = (next: Row[]) => onChange({ ...p, mapping: Object.fromEntries(next) });
  const isUsed = (name: string) => rows.some(([from]) => from === name);
  const unused = columns.filter((column) => !isUsed(column.name));
  return (
    <>
      {rows.map(([from, to], index) => (
        <fieldset className="rename-row" key={index}>
          <legend className="sr-only">Rename {index + 1}</legend>
          <ColumnPicker
            label="Column"
            columns={columns.filter((column) => column.name === from || !isUsed(column.name))}
            value={from}
            onChange={(name) => update(rows.map((row, at) => (at === index ? [name, to] : row)))}
          />
          <TextField
            label="New name"
            name={fieldName(from)}
            value={to}
            error={errorFor(fieldName(from))}
            onChange={(name) => update(rows.map((row, at) => (at === index ? [from, name] : row)))}
          />
          {rows.length > 1 && (
            <button
              type="button"
              className="rename-remove"
              aria-label={`Remove rename ${index + 1}`}
              title="Remove"
              onClick={() => update(rows.filter((_, at) => at !== index))}
            >
              ×
            </button>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        disabled={!unused.length}
        onClick={() => update([...rows, [unused[0].name, '']])}
      >
        Add column
      </button>
    </>
  );
}

/** A clash is reported on the later row, so the first use of a name stays valid. */
export function submitRename(p: Parameters, columns: Column[]): Submission {
  const rows = rowsOf(p).map(([from, to]): Row => [from, to.trim()]);
  if (!rows.length) return { error: 'Add a column to rename.' };
  if (rows.some(([from]) => !hasColumn(columns, from))) return { error: 'Select a column.' };
  const kept = columns
    .map((column) => column.name)
    .filter((name) => !rows.some(([from]) => from === name));
  for (const [index, [from, to]] of rows.entries()) {
    const taken = [...kept, ...rows.slice(0, index).map(([, name]) => name)];
    const error =
      to === from ? 'Enter a name different from the current one.' : columnNameError(to, taken);
    if (error) return { error, field: fieldName(from) };
  }
  return { parameters: { mapping: Object.fromEntries(rows) } };
}
