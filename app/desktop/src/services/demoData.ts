import type { Dataset, HistoryMetadata, Preview } from '../types/dataset';

type DemoTable = { dataset: Dataset; records: Record<string, string>[] };
const tables = new Map<string, DemoTable>();
const datasetIdsByPath = new Map<string, string>();
let nextDemoId = 0;
const DEMO_FILES_DATABASE = 'forma-demo-files';
const DEMO_FILES_STORE = 'files';

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

export async function setDemoFile(csv: string, path: string): Promise<string> {
  await saveDemoFile(path, csv);
  return registerDemoFile(csv, path);
}

function registerDemoFile(csv: string, path: string): string {
  const id = `demo-dataset-${++nextDemoId}`;
  const table = parseCsv(csv, path);
  table.dataset.dataset_id = id;
  tables.set(id, table);
  datasetIdsByPath.set(path, id);
  return id;
}

function openDemoFilesDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Persistent local file storage is unavailable.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DEMO_FILES_DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(DEMO_FILES_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Could not open persistent local file storage.'));
  });
}

async function saveDemoFile(path: string, csv: string): Promise<void> {
  const database = await openDemoFilesDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(DEMO_FILES_STORE, 'readwrite');
    transaction.objectStore(DEMO_FILES_STORE).put(csv, path);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Could not persist the selected CSV file.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Could not persist the selected CSV file.'));
  }).finally(() => database.close());
}

async function loadDemoFile(path: string): Promise<string | undefined> {
  const database = await openDemoFilesDatabase();
  return new Promise<string | undefined>((resolve, reject) => {
    const transaction = database.transaction(DEMO_FILES_STORE, 'readonly');
    const request = transaction.objectStore(DEMO_FILES_STORE).get(path);
    request.onsuccess = () =>
      resolve(typeof request.result === 'string' ? request.result : undefined);
    request.onerror = () =>
      reject(request.error ?? new Error('Could not load the saved CSV file.'));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Could not load the saved CSV file.'));
  }).finally(() => database.close());
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

async function getSampleTable(): Promise<DemoTable> {
  let table = tables.get('demo-dataset');
  if (!table) {
    table = parseCsv(await (await fetch('/sample.csv')).text(), 'sample.csv');
    tables.set(table.dataset.dataset_id, table);
  }
  return table;
}

async function getTable(datasetId: unknown): Promise<DemoTable> {
  if (datasetId === undefined) return getSampleTable();
  if (typeof datasetId !== 'string') {
    throw new Error('The selected dataset is unavailable in browser demo mode.');
  }
  let table = tables.get(datasetId) ?? tables.get(datasetIdsByPath.get(datasetId) ?? '');
  if (!table) {
    const csv = await loadDemoFile(datasetId);
    if (csv !== undefined) {
      registerDemoFile(csv, datasetId);
      table = tables.get(datasetIdsByPath.get(datasetId) ?? '');
    }
  }
  if (!table && datasetId === 'sample.csv') table = await getSampleTable();
  if (!table) {
    throw new Error('Select the local CSV with Browse files when using browser demo mode.');
  }
  return table;
}

export async function requestDemo<T>(method: string, params: Record<string, unknown>): Promise<T> {
  if (method === 'dataset.open') {
    return (await getTable(params.path)).dataset as T;
  }
  const current = await getTable(params.dataset_id);
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
