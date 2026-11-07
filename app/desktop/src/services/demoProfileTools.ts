import type { HistogramBin } from '../types/profile';
import type { CellMark } from '../types/profileTools';
import { demoProfile } from './demoProfile';
import { anomalies, patterns, suggestions } from './demoProfileInsights';
import { ROWS, columns, named, problems, quartiles, round } from './demoProfileStats';

/** Demo answers for the Profile tool methods, built from the demo profile. They are
 *  plausible fixtures for the layout and UI tests, not computed statistics. */

export const DEMO_TOOL_METHODS = new Set([
  'profile.column_detail',
  'profile.rows',
  'profile.distribution',
  'profile.duplicates',
  'profile.patterns',
  'profile.anomalies',
  'profile.suggestions',
]);

type Params = Record<string, unknown>;
function columnDetail(params: Params) {
  const column = named(params.column);
  const lengths = column.examples.map((value) => value.length);
  return {
    column,
    quartiles: quartiles(column),
    text_length: column.numeric
      ? null
      : {
          min: Math.min(...lengths),
          max: Math.max(...lengths),
          mean: round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
        },
    invalid_values: column.invalid_count
      ? [
          {
            value: ' ',
            count: column.invalid_count,
            reason: `${column.name}: " " is not a decimal number`,
          },
        ]
      : [],
  };
}

function rows(params: Params) {
  const filter = params.filter as { kind: string; column: string | null };
  const offset = Number(params.offset ?? 0);
  const limit = Number(params.limit ?? 100);
  const target = filter.column ? named(filter.column) : null;
  const outlier =
    filter.kind === 'outliers' ? anomalies().find((a) => a.column === target?.name) : null;
  const marked = target ? [target] : columns.filter((column) => problems(column) > 0);
  const total = outlier
    ? outlier.count
    : target
      ? problems(target)
      : Math.min(
          ROWS,
          marked.reduce((sum, column) => sum + problems(column), 0),
        );
  const page = [];
  for (let k = offset; k < Math.min(total, offset + limit); k++) {
    const column = marked[k % marked.length];
    const invalid = !outlier && k % 7 === 0 && column.invalid_count > 0;
    const mark: CellMark = outlier ? 'outlier' : invalid ? 'invalid' : 'missing';
    const values = columns.map((each) => {
      if (each !== column) return each.examples[k % each.examples.length] ?? null;
      if (outlier) return outlier.extremes[k % outlier.extremes.length];
      return invalid ? ' ' : null;
    });
    page.push({
      row: k * 2 + 1,
      values,
      marks: { [column.name]: mark },
      reasons: invalid ? { [column.name]: `${column.name}: " " is not a decimal number` } : {},
    });
  }
  return { columns: columns.map((column) => column.name), total, offset, rows: page };
}

/** Spreads each original bin over the new bins it overlaps; the sum is kept exactly. */
function rebin(histogram: HistogramBin[], bins: number): HistogramBin[] {
  const low = Number(histogram[0].start);
  const high = Number(histogram.at(-1)!.end);
  const width = (high - low) / bins || 1;
  const shares = Array.from({ length: bins }, () => 0);
  for (const bin of histogram) {
    const [start, end] = [Number(bin.start), Number(bin.end)];
    for (let i = 0; i < bins; i++) {
      const overlap = Math.min(end, low + (i + 1) * width) - Math.max(start, low + i * width);
      if (overlap > 0) shares[i] += (bin.count * overlap) / (end - start || 1);
    }
  }
  const counts = shares.map(Math.floor);
  const total = histogram.reduce((sum, bin) => sum + bin.count, 0);
  const order = shares.map((share, i) => [share % 1, i]).sort((a, b) => b[0] - a[0]);
  const missing = total - counts.reduce((a, b) => a + b, 0);
  for (let k = 0; k < missing; k++) counts[order[k][1]]++;
  return counts.map((count, i) => ({
    start: round(low + i * width),
    end: round(low + (i + 1) * width),
    count,
  }));
}

function distribution(params: Params) {
  const column = named(params.column);
  const numeric = column.numeric!;
  const q = quartiles(column)!;
  return {
    column: column.name,
    // Like the engine: integers with no more values than bars get one bar per value.
    bins:
      column.detected_type === 'integer' && numeric.histogram.length <= Number(params.bins ?? 30)
        ? numeric.histogram
        : rebin(numeric.histogram, Number(params.bins ?? 30)),
    box: {
      ...q,
      lower_whisker: Number(numeric.min),
      upper_whisker: Number(numeric.max),
      outliers: 0,
    },
  };
}

function duplicates(params: Params) {
  const keys = (params.columns as string[] | null) ?? null;
  if (!keys)
    return {
      columns: columns.map((column) => column.name),
      duplicate_rows: demoProfile.duplicate_rows,
      group_count: demoProfile.duplicate_rows,
      groups: Array.from({ length: demoProfile.duplicate_rows }, (_, k) => ({
        values: columns.map((column) => column.examples[k % column.examples.length] ?? null),
        size: 2,
      })),
    };
  const chosen = keys.map(named);
  const groupCount = Math.min(
    ROWS,
    chosen.reduce((product, column) => product * column.unique_count, 1),
  );
  const top = chosen[0].categories?.top ?? [];
  return {
    columns: keys,
    duplicate_rows: ROWS - groupCount,
    group_count: groupCount,
    groups:
      groupCount === ROWS
        ? []
        : top.slice(0, 20).map((item) => ({
            values: [item.value, ...chosen.slice(1).map((column) => column.examples[0] ?? null)],
            size: item.count,
          })),
  };
}

const BUILDERS: Record<string, (params: Params) => object> = {
  'profile.column_detail': columnDetail,
  'profile.rows': rows,
  'profile.distribution': distribution,
  'profile.duplicates': duplicates,
  'profile.patterns': patterns,
  'profile.anomalies': () => ({ columns: anomalies() }),
  'profile.suggestions': suggestions,
};

/** A completed job acknowledgement, as demo mode answers every profile job at once. */
export function demoProfileTool(method: string, params: Params) {
  const result = {
    dataset_id: params.dataset_id,
    data_version: params.data_version,
    computed_at: demoProfile.computed_at,
    ...BUILDERS[method](params),
  };
  return { job_id: `demo-${method}`, state: 'completed', result };
}
