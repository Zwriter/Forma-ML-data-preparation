import type { Dataset, HistoryMetadata, Preview } from '../types/dataset';

type DemoTable = { dataset: Dataset; records: Record<string, string>[] };
let table: DemoTable | undefined;

export function parseCsv(csv: string, path = 'sample.csv'): DemoTable {
  const lines = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift() ?? '');
  const records = lines.map((line) =>
    Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])),
  );
  const schema = headers.map((name) => ({
    name,
    type: records.every((record) => record[name] === '' || Number.isFinite(Number(record[name])))
      ? 'Float64'
      : 'String',
    nullable: records.some((record) => record[name] === ''),
  }));
  return {
    dataset: {
      dataset_id: 'demo-dataset',
      source_path: path,
      format: 'csv',
      schema,
      columns: schema.length,
      rows: records.length,
      state: 'open',
    },
    records,
  };
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else cell += character;
  }
  cells.push(cell);
  return cells;
}

async function getTable(): Promise<DemoTable> {
  if (!table) table = parseCsv(await (await fetch('/sample.csv')).text(), 'sample.csv');
  return table;
}

export async function requestDemo<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const current = await getTable();
  if (method === 'dataset.open') return current.dataset as T;
  if (method === 'dataset.history') return emptyHistory(current.dataset.dataset_id) as T;
  if (method === 'dataset.preview') {
    const offset = Number(params.offset ?? 0);
    const limit = Number(params.limit ?? 100);
    const requested = params.columns as string[] | undefined;
    const columns = current.dataset.schema.filter(
      (column) => !requested || requested.includes(column.name),
    );
    const records = current.records
      .slice(offset, offset + limit)
      .map((record) =>
        Object.fromEntries(columns.map((column) => [column.name, record[column.name]])),
      );
    return {
      dataset_id: current.dataset.dataset_id,
      columns,
      records,
      offset,
      limit,
      total_count: current.records.length,
    } as T;
  }
  throw new Error(`The ${method} action is unavailable in browser demo mode.`);
}

function emptyHistory(datasetId: string): HistoryMetadata {
  return {
    history_id: 'demo-history',
    dataset_id: datasetId,
    current_index: 0,
    saved_index: 0,
    is_dirty: false,
    can_undo: false,
    can_redo: false,
  };
}
