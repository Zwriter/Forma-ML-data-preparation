import type { Column } from '../../../types/dataset';
import { datePartLabels, datePartNames } from '../stepCatalog';
import { ColumnPicker, TextField, Toggle, columnNameError, hasColumn } from './formControls';
import type { Parameters, StepFormProps, Submission } from './formControls';

const ALL_PARTS = Object.keys(datePartLabels);
const partsOf = (p: Parameters) => (Array.isArray(p.parts) ? (p.parts as string[]) : []);
const namesOf = (p: Parameters) => (p.names as Record<string, string>) ?? {};
const fieldName = (part: string) => `name:${part}`;

/** Pick a date column, the parts to extract, and a name for each new column. */
function DatePartsForm({ parameters: p, columns, onChange, errorFor }: StepFormProps) {
  const parts = partsOf(p);
  const names = namesOf(p);
  const togglePart = (part: string, on: boolean) => {
    const next = ALL_PARTS.filter((each) => (each === part ? on : parts.includes(each)));
    const kept = Object.fromEntries(next.map((each) => [each, names[each]]));
    onChange({ ...p, parts: next, names: { ...datePartNames(String(p.column), next), ...kept } });
  };
  return (
    <>
      <ColumnPicker
        label="Column"
        columns={columns}
        value={p.column}
        onChange={(column) => onChange({ ...p, column, names: datePartNames(column, parts) })}
      />
      <fieldset className="column-checklist">
        <legend>Parts</legend>
        {ALL_PARTS.map((part) => (
          <Toggle
            key={part}
            label={datePartLabels[part]}
            checked={parts.includes(part)}
            onChange={(on) => togglePart(part, on)}
          />
        ))}
      </fieldset>
      {parts.map((part) => (
        <TextField
          key={part}
          label={`${datePartLabels[part]} column name`}
          name={fieldName(part)}
          value={names[part] ?? ''}
          error={errorFor(fieldName(part))}
          onChange={(name) => onChange({ ...p, names: { ...names, [part]: name } })}
        />
      ))}
    </>
  );
}

function submitDateParts(p: Parameters, columns: Column[]): Submission {
  if (!hasColumn(columns, p.column)) return { error: 'Select a column.' };
  const parts = partsOf(p);
  if (!parts.length) return { error: 'Choose at least one date part.' };
  const names: Record<string, string> = {};
  const taken = columns.map((column) => column.name);
  for (const part of parts) {
    const name = String(namesOf(p)[part] ?? '').trim();
    const error = columnNameError(name, taken);
    if (error) return { error, field: fieldName(part) };
    names[part] = name;
    taken.push(name);
  }
  return { parameters: { column: p.column, parts, names } };
}

export const datePartsForm = {
  extract_date_parts: { Form: DatePartsForm, submit: submitDateParts },
};
