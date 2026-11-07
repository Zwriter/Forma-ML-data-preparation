import type { OutlierSummary, Suggestion } from '../types/profileTools';
import { demoProfile } from './demoProfile';
import { ROWS, columns, problems, quartiles, round } from './demoProfileStats';

/** Demo answers for the Insights tools: patterns, anomalies, and suggestions. */

const CORRELATIONS: Record<string, number> = {
  'SeniorCitizen|tenure': 0.02,
  'SeniorCitizen|MonthlyCharges': 0.22,
  'SeniorCitizen|TotalCharges': 0.1,
  'tenure|MonthlyCharges': 0.25,
  'tenure|TotalCharges': 0.83,
  'MonthlyCharges|TotalCharges': 0.65,
};

const shapeOf = (value: string) =>
  value.replace(/\p{L}/gu, 'A').replace(/\p{N}/gu, '9').slice(0, 30);

export function patterns() {
  const numeric = columns.filter((column) => column.numeric).map((column) => column.name);
  const r = (a: string, b: string) =>
    a === b ? 1 : (CORRELATIONS[`${a}|${b}`] ?? CORRELATIONS[`${b}|${a}`] ?? null);
  const pairs = numeric.flatMap((a, i) => numeric.slice(i + 1).map((b) => ({ a, b, r: r(a, b)! })));
  const formats = columns
    .filter((column) => column.categories)
    .map((column) => {
      const top = column.categories!.top;
      const counted = new Map<string, number>();
      for (const item of top)
        counted.set(shapeOf(item.value), (counted.get(shapeOf(item.value)) ?? 0) + item.count);
      const seen = top.reduce((sum, item) => sum + item.count, 0);
      const present = ROWS - column.missing_count;
      const shapes = [...counted]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 5)
        .map(([shape, count]) => ({
          shape,
          count: Math.round((count / seen) * present),
          share: round(count / seen),
        }));
      return { column: column.name, formats: shapes, mixed: shapes[0].share < 0.9 };
    });
  return {
    correlation: {
      columns: numeric,
      left_out: 0,
      matrix: numeric.map((a) => numeric.map((b) => r(a, b))),
      strongest: pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r)).slice(0, 5),
    },
    formats,
  };
}

const EXTREMES: Record<string, string[]> = { TotalCharges: ['8684.8', '8672.45', '8670.1'] };

export function anomalies(): OutlierSummary[] {
  return columns
    .filter((column) => column.numeric)
    .map((column) => {
      const q = quartiles(column)!;
      const spread = q.q3 - q.q1;
      const count = EXTREMES[column.name]?.length ?? 0;
      return {
        column: column.name,
        low: round(q.q1 - 1.5 * spread),
        high: round(q.q3 + 1.5 * spread),
        count,
        share: round(count / (ROWS - problems(column))),
        extremes: EXTREMES[column.name] ?? [],
        note: spread === 0 ? ('no_spread' as const) : null,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function suggestions() {
  const found: Suggestion[] = [];
  for (const column of columns) {
    const share = column.missing_count / ROWS;
    if (column.stored_type === 'String' && column.numeric)
      found.push({
        id: `convert:${column.name}`,
        kind: 'convert',
        title: `Convert ${column.name} to numbers`,
        detail: `${column.name} holds numbers stored as text; ${column.invalid_count} invalid values will become missing.`,
        cells_affected: ROWS - column.missing_count,
        steps: [
          { type: 'convert_type', parameters: { column: column.name, target_type: 'float' } },
        ],
        examples: null,
      });
    if (share > 0 && share <= 0.2) {
      const strategy = column.numeric ? 'median' : 'mode';
      found.push({
        id: `fill_missing:${column.name}`,
        kind: 'fill_missing',
        title: `Fill missing values in ${column.name}`,
        detail: `${column.missing_count} missing values (${round(share * 100)}%), filled with the ${strategy === 'median' ? 'median' : 'most frequent value'}.`,
        cells_affected: column.missing_count,
        steps: [{ type: 'fill_null', parameters: { column: column.name, strategy } }],
        examples: null,
      });
    }
  }
  found.push({
    id: 'remove_duplicates:*',
    kind: 'remove_duplicates',
    title: 'Remove duplicate rows',
    detail: `${demoProfile.duplicate_rows} rows repeat an earlier row in every column.`,
    cells_affected: demoProfile.duplicate_rows * demoProfile.column_count,
    steps: [{ type: 'drop_duplicates', parameters: { columns: null } }],
    examples: null,
  });
  return {
    recommendations: found.sort((a, b) => b.cells_affected - a.cells_affected),
    creations: [],
  };
}
