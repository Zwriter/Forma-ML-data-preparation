import type { IconName } from '../../components/Icon';
import type { CleaningStep, StepType } from '../../types/cleaning';
import type { Column } from '../../types/dataset';

type Parameters = Record<string, unknown>;

type StepDefinition = {
  title: string;
  icon: IconName;
  defaults: (columns: Column[]) => Parameters;
  summary: (parameters: Parameters) => string[];
};

/** Wording shared by the step forms and the step cards. */
export const fillLabels: Record<string, string> = {
  constant: 'Fixed value',
  mean: 'Average',
  median: 'Median',
  mode: 'Most frequent value',
  previous: 'Previous value',
  next: 'Next value',
};

export const targetLabels: Record<string, string> = {
  string: 'Text',
  integer: 'Whole number',
  float: 'Decimal number',
  boolean: 'True/false',
  date: 'Date',
};

export const datePartLabels: Record<string, string> = {
  year: 'Year',
  month: 'Month',
  day: 'Day',
  weekday: 'Weekday',
};

/** "{column}_{part}" for each part, the default names of new date part columns. */
export const datePartNames = (column: string, parts: string[]) =>
  Object.fromEntries(parts.map((part) => [part, `${column}_${part}`]));

const names = (value: unknown) => (Array.isArray(value) ? value.join(', ') : '');
const quoted = (value: unknown) => `"${String(value ?? '')}"`;

export const stepCatalog: Record<StepType, StepDefinition> = {
  fill_null: {
    title: 'Fill missing values',
    icon: 'fill',
    defaults: (columns) => ({ column: columns[0]?.name ?? '', strategy: 'constant', value: '' }),
    summary: (p) => [
      `Column: ${p.column}`,
      `Fill with: ${fillLabels[String(p.strategy)] ?? p.strategy}`,
      ...(p.strategy === 'constant' ? [`Value: ${p.value}`] : []),
    ],
  },
  replace_values: {
    title: 'Replace values',
    icon: 'replace',
    defaults: (columns) => ({
      columns: columns.slice(0, 1).map((column) => column.name),
      find: '',
      replace: '',
      match: 'whole',
      case_sensitive: false,
    }),
    summary: (p) => [
      `Columns: ${names(p.columns)}`,
      `Find: ${quoted(p.find)}`,
      `Replace with: ${p.replace === null ? 'missing' : quoted(p.replace)}`,
    ],
  },
  convert_type: {
    title: 'Convert type',
    icon: 'datatype',
    defaults: (columns) => ({ column: columns[0]?.name ?? '', to: 'string', on_error: 'fail' }),
    summary: (p) => [`Column: ${p.column}`, `Convert to: ${targetLabels[String(p.to)] ?? p.to}`],
  },
  split_column: {
    title: 'Split column',
    icon: 'split',
    defaults: (columns) => {
      const column = columns[0]?.name ?? '';
      return {
        column,
        separator: ' ',
        into: [`${column}_1`, `${column}_2`],
        drop_original: false,
      };
    },
    summary: (p) => [
      `Column: ${p.column}`,
      `Separator: ${quoted(p.separator)}`,
      `Into: ${names(p.into)}`,
    ],
  },
  merge_columns: {
    title: 'Merge columns',
    icon: 'merge',
    defaults: (columns) => ({
      columns: columns.slice(0, 2).map((column) => column.name),
      separator: ' ',
      into: 'merged',
      drop_sources: false,
    }),
    summary: (p) => [
      `Columns: ${names(p.columns)}`,
      `Separator: ${quoted(p.separator)}`,
      `Into: ${p.into}`,
    ],
  },
  extract_date_parts: {
    title: 'Extract date parts',
    icon: 'split',
    defaults: (columns) => {
      const column = (columns.find((item) => /date/i.test(item.type)) ?? columns[0])?.name ?? '';
      const parts = Object.keys(datePartLabels);
      return { column, parts, names: datePartNames(column, parts) };
    },
    summary: (p) => {
      const parts = (p.parts as string[]) ?? [];
      const into = (p.names as Record<string, string>) ?? {};
      return [
        `Column: ${p.column}`,
        `Parts: ${parts.map((part) => datePartLabels[part] ?? part).join(', ')}`,
        `Into: ${parts.map((part) => into[part]).join(', ')}`,
      ];
    },
  },
  drop_duplicates: {
    title: 'Remove duplicate rows',
    icon: 'clean',
    defaults: () => ({}),
    summary: (p) => [`Compare: ${names(p.columns) || 'all columns'}`],
  },
  drop_null_rows: {
    title: 'Remove rows with missing values',
    icon: 'clean',
    defaults: () => ({}),
    summary: (p) => [`Columns: ${names(p.columns) || 'any column'}`],
  },
  drop_columns: {
    title: 'Remove columns',
    icon: 'clean',
    defaults: () => ({ columns: [] }),
    summary: (p) => [`Columns: ${names(p.columns) || 'none selected'}`],
  },
  rename_columns: {
    title: 'Rename columns',
    icon: 'columns',
    defaults: (columns) => ({ mapping: { [columns[0]?.name ?? '']: '' } }),
    summary: (p) => [
      Object.entries((p.mapping as Record<string, string>) ?? {})
        .map(([from, to]) => `${from} → ${to}`)
        .join(', ') || 'No columns renamed',
    ],
  },
};

export const ribbonStepTypes: Record<string, StepType> = {
  Convert: 'convert_type',
  Replace: 'replace_values',
  Fill: 'fill_null',
  Split: 'split_column',
  Merge: 'merge_columns',
  Remove: 'drop_duplicates',
  Rename: 'rename_columns',
};

export function summarizeStep(step: CleaningStep) {
  return stepCatalog[step.type].summary(step.parameters).join(' • ');
}
