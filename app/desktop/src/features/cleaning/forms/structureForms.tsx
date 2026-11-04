import type { StepType } from '../../../types/cleaning';
import type { Column } from '../../../types/dataset';
import {
  Choice,
  ColumnPicker,
  MultiColumnPicker,
  TextField,
  Toggle,
  columnNameError,
  hasColumn,
  isNumericColumn,
} from './formControls';
import type { Parameters, StepFormDefinition, StepFormProps, Submission } from './formControls';
import { RenameForm, submitRename } from './renameForm';

const removeLabels = {
  drop_duplicates: 'Duplicate rows',
  drop_null_rows: 'Rows with missing values',
  drop_columns: 'Columns',
};

const pickedColumns = (p: Parameters) => (Array.isArray(p.columns) ? (p.columns as string[]) : []);

function RemoveForm({ parameters: p, columns, onChange, type, onTypeChange }: StepFormProps) {
  const legends: Record<string, string> = {
    drop_duplicates: 'Compare columns (none selected compares all columns)',
    drop_null_rows: 'Check columns (none selected checks every column)',
    drop_columns: 'Columns to remove',
  };
  return (
    <>
      <Choice
        label="Remove"
        value={type}
        labels={removeLabels}
        onChange={(next) => onTypeChange(next as StepType)}
      />
      <MultiColumnPicker
        legend={legends[type]}
        columns={columns}
        value={p.columns}
        onChange={(names) => onChange({ ...p, columns: names })}
      />
    </>
  );
}

/** Duplicates and missing-value rows omit `columns` to mean every column. */
function submitRowRemoval(p: Parameters): Submission {
  const names = pickedColumns(p);
  return { parameters: names.length ? { columns: names } : {} };
}

function submitColumnRemoval(p: Parameters, columns: Column[]): Submission {
  const names = pickedColumns(p);
  if (!names.length) return { error: 'Select at least one column to remove.' };
  if (names.length >= columns.length) return { error: 'Keep at least one column.' };
  return { parameters: { columns: names } };
}

const partNames = (column: unknown) => [`${column}_1`, `${column}_2`];

function SplitForm({ parameters: p, columns, onChange, errorFor }: StepFormProps) {
  const into = Array.isArray(p.into) ? (p.into as string[]) : [];
  return (
    <>
      <ColumnPicker
        label="Column"
        columns={columns.filter((column) => !isNumericColumn(columns, column.name))}
        value={p.column}
        onChange={(column) => {
          const suggested = into.join() === partNames(p.column).join();
          onChange({ ...p, column, into: suggested ? partNames(column) : into });
        }}
      />
      <TextField
        label="Separator"
        name="separator"
        value={p.separator}
        error={errorFor('separator')}
        onChange={(separator) => onChange({ ...p, separator })}
      />
      <TextField
        label="New column names (comma-separated)"
        name="into"
        value={into.join(',')}
        error={errorFor('into')}
        onChange={(text) => onChange({ ...p, into: text.split(',') })}
      />
      <Toggle
        label="Remove the original column"
        checked={Boolean(p.drop_original)}
        onChange={(drop_original) => onChange({ ...p, drop_original })}
      />
    </>
  );
}

function submitSplit(p: Parameters, columns: Column[]): Submission {
  if (!hasColumn(columns, p.column)) return { error: 'Select a column.' };
  if (!p.separator) return { error: 'Enter a separator.', field: 'separator' };
  const into = (Array.isArray(p.into) ? (p.into as string[]) : []).map((name) => name.trim());
  const field = 'into';
  if (into.filter(Boolean).length < 2)
    return { error: 'Enter at least two new column names.', field };
  if (into.some((name) => !name)) return { error: 'Remove the empty column name.', field };
  const kept = columns
    .map((column) => column.name)
    .filter((name) => !(p.drop_original && name === p.column));
  for (const [index, name] of into.entries()) {
    const error = columnNameError(name, [...kept, ...into.slice(0, index)]);
    if (error) return { error, field };
  }
  return { parameters: { ...p, into } };
}

function MergeForm({ parameters: p, columns, onChange, errorFor }: StepFormProps) {
  const picked = pickedColumns(p);
  return (
    <>
      <MultiColumnPicker
        legend="Columns, in the order to merge them"
        columns={columns}
        value={picked}
        onChange={(names) => onChange({ ...p, columns: names })}
      />
      {picked.length > 0 && <p className="field-hint">Order: {picked.join(', ')}</p>}
      <TextField
        label="Separator"
        name="separator"
        value={p.separator}
        onChange={(separator) => onChange({ ...p, separator })}
      />
      <TextField
        label="New column name"
        name="into"
        value={p.into}
        error={errorFor('into')}
        onChange={(into) => onChange({ ...p, into })}
      />
      <Toggle
        label="Remove the source columns"
        checked={Boolean(p.drop_sources)}
        onChange={(drop_sources) => onChange({ ...p, drop_sources })}
      />
    </>
  );
}

function submitMerge(p: Parameters, columns: Column[]): Submission {
  const sources = pickedColumns(p);
  if (sources.length < 2) return { error: 'Select at least two columns to merge.' };
  const into = String(p.into ?? '').trim();
  if (!into) return { error: 'Enter a name for the merged column.', field: 'into' };
  const kept = columns
    .map((column) => column.name)
    .filter((name) => !(p.drop_sources && sources.includes(name)));
  const error = columnNameError(into, kept);
  if (error) return { error, field: 'into' };
  return { parameters: { ...p, separator: String(p.separator ?? ''), into } };
}

export const structureForms = {
  drop_duplicates: { Form: RemoveForm, submit: submitRowRemoval },
  drop_null_rows: { Form: RemoveForm, submit: submitRowRemoval },
  drop_columns: { Form: RemoveForm, submit: submitColumnRemoval },
  rename_columns: { Form: RenameForm, submit: submitRename },
  split_column: { Form: SplitForm, submit: submitSplit },
  merge_columns: { Form: MergeForm, submit: submitMerge },
} satisfies Partial<Record<StepType, StepFormDefinition>>;
